import os
from typing import Any

import pandas as pd
from loguru import logger
from tenacity import sleep
from tqdm import tqdm

from app import create_app
from app.services import routing_service

# Configure loguru
logger.remove()
logger.add(
    "benchmark_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="30 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
)
logger.add(
    lambda msg: tqdm.write(msg, end=""),
    level="INFO",
    format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}",
)


def run_sql(row: pd.Series, limit: int = 50) -> dict[str, Any]:
    """Process a single SQL query"""
    try:
        question: str = row["Query"]
        result = routing_service.route(question, limit=limit)
        sleep(0.2)
        return {
            "generated_sql": result["outputs"]["step4"]["final_sql"],
            "token_consumed": result["token_consumed"],
            "executed": True,
            "error": None,
        }
    except Exception as e:
        query_preview = (
            str(row.get("Query", "Unknown"))[:50] + "..."
            if len(str(row.get("Query", "Unknown"))) > 50
            else str(row.get("Query", "Unknown"))
        )
        logger.error(f"Error processing query '{query_preview}': {e}")
        return {
            "generated_sql": None,
            "token_consumed": 0,
            "executed": False,
            "error": str(e),
        }


def load_processed_queries(output_path: str) -> dict[str, bool]:
    """Load already processed queries from CSV"""
    if not os.path.exists(output_path):
        logger.debug(f"Output file {output_path} does not exist, starting fresh")
        return {}

    try:
        processed_df = pd.read_csv(output_path)
        if "executed" not in processed_df.columns:
            logger.warning(f"'executed' column not found in {output_path}")
            return {}

        # Only consider successfully executed queries
        executed_queries = processed_df[processed_df["executed"] == True]
        status_dict = dict(zip(executed_queries["Query"], executed_queries["executed"]))

        logger.info(f"Loaded {len(status_dict)} processed queries from {output_path}")
        return status_dict

    except Exception as e:
        logger.warning(f"Could not load processed status from {output_path}: {e}")
        return {}


def process_sheet(
    sheet_data: pd.DataFrame,
    sheet_name: str,
    output_path: str,
) -> None:
    """Process a single Excel sheet"""
    logger.info(f"Processing sheet: {sheet_name}")

    # Load processed status
    processed_status = load_processed_queries(output_path)

    # Mark already processed rows
    sheet_data["executed"] = sheet_data["Query"].map(
        lambda q: processed_status.get(q, False)
    )

    # Get unprocessed rows
    unprocessed_rows = sheet_data[~sheet_data["executed"]]
    total_unprocessed = len(unprocessed_rows)
    total_rows = len(sheet_data)
    already_processed = total_rows - total_unprocessed

    if total_unprocessed == 0:
        logger.success(
            f"All {total_rows} rows in sheet '{sheet_name}' are already processed"
        )
        return

    logger.info(
        f"Sheet '{sheet_name}': {already_processed}/{total_rows} processed, {total_unprocessed} remaining"
    )

    # Check if we need to write header
    write_header = not os.path.exists(output_path)

    # Process rows with progress bar
    progress_bar = tqdm(
        unprocessed_rows.iterrows(),
        total=total_unprocessed,
        desc=f"Processing {sheet_name}",
        unit="query",
        leave=False,
        colour="green",
    )

    processed_count = 0
    error_count = 0

    for _, (_, row) in enumerate(progress_bar):
        try:
            # Process query
            result = run_sql(row)

            # Merge result with original row
            row_result = row.to_dict()
            row_result.update(result)

            # Append to CSV
            pd.DataFrame([row_result]).to_csv(
                output_path, mode="a", index=False, header=write_header
            )
            write_header = False

            if result["executed"]:
                processed_count += 1
            else:
                error_count += 1

            # Update progress bar
            if (processed_count + error_count) > 0:
                success_rate = (processed_count / (processed_count + error_count)) * 100
                progress_bar.set_postfix(
                    {
                        "Success": f"{processed_count}",
                        "Errors": f"{error_count}",
                        "Rate": f"{success_rate:.1f}%",
                    }
                )

        except Exception as e:
            error_count += 1
            logger.error(f"Failed to process row in sheet '{sheet_name}': {e}")
            continue

    progress_bar.close()

    # Final statistics
    total_processed_now = processed_count + error_count
    if total_processed_now > 0:
        success_rate = (processed_count / total_processed_now) * 100
        logger.success(
            f"Sheet '{sheet_name}' completed: {processed_count} successful, "
            f"{error_count} errors ({success_rate:.1f}% success rate)"
        )
    else:
        logger.warning(f"No rows were processed for sheet '{sheet_name}'")


def bench_coverage_test(excel_filename: str) -> None:
    logger.info(f"Starting benchmark coverage test")
    logger.info(f"Excel file: {excel_filename}")

    app = create_app("development")

    with app.app_context():
        # Setup paths
        root_dir = app.root_path
        data_dir = os.path.join(os.path.dirname(root_dir), "data")
        file_path = os.path.join(data_dir, excel_filename)
        output_dir = os.path.join(data_dir, "results_csv")

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        logger.info(f"Output directory: {output_dir}")

        # Check input file exists
        if not os.path.exists(file_path):
            logger.error(f"Excel file not found at '{file_path}'")
            return

        try:
            # Process Excel file
            with pd.ExcelFile(file_path) as excel_file:
                sheet_names = excel_file.sheet_names
                logger.info(f"Found {len(sheet_names)} sheets: {sheet_names}")

                # Overall progress bar for sheets
                sheet_progress = tqdm(
                    sheet_names,
                    desc="Processing sheets",
                    unit="sheet",
                    colour="blue",
                    position=0,
                )

                processed_sheets = 0
                failed_sheets = 0

                for sheet_name in sheet_progress:
                    sheet_progress.set_description(f"Processing sheet: {sheet_name}")

                    try:
                        # Read sheet data
                        sheet_data = excel_file.parse(sheet_name)

                        # Validate required columns
                        if "Query" not in sheet_data.columns:
                            logger.warning(
                                f"Sheet '{sheet_name}' missing 'Query' column, skipping"
                            )
                            failed_sheets += 1
                            continue

                        # Set output file path
                        output_path = os.path.join(output_dir, f"{sheet_name}.csv")

                        # Process sheet
                        process_sheet(
                            sheet_data,
                            sheet_name,
                            output_path,
                        )
                        processed_sheets += 1

                    except Exception as e:
                        logger.error(f"Error processing sheet '{sheet_name}': {e}")
                        failed_sheets += 1
                        continue

                sheet_progress.close()

                # Final summary
                logger.success(
                    f"Benchmark test completed! "
                    f"Processed: {processed_sheets} sheets, "
                    f"Failed: {failed_sheets} sheets"
                )
                logger.info(f"Results saved to '{output_dir}'")

        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            raise


if __name__ == "__main__":
    excel_file = "generated_queries_capstone.xlsx"

    try:
        bench_coverage_test(excel_file)
    except KeyboardInterrupt:
        logger.warning("Process interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise
