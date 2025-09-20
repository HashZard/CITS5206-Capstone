import os
import pandas as pd
import logging
from app import create_app
from app.services.routing_service import RoutingService

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def run_sql(row, routing_service: RoutingService):
    question: str = row["Query"]
    # result = routing_service.route(question, limit=50)
    # return result["outputs"]["step4"]["final_sql"]

    return pd.Series({"generated_sql": "sql:" + question, "token_consumed": 199})


def bench_coverage_test():
    app = create_app("development")
    with app.app_context():
        root_dir = app.root_path
        data_dir = os.path.join(os.path.dirname(root_dir), "data")
        file_path = os.path.join(data_dir, "generated_queries_capstone.xlsx")
        output_path = os.path.join(data_dir, "results.xlsx")

        try:
            routing_service = RoutingService()
            # Read all sheet names without loading data first
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names

            with pd.ExcelWriter(output_path) as writer:
                for sheet_name in sheet_names:
                    logging.info(f"Processing sheet: {sheet_name}")
                    # Read each sheet one by one
                    sheet = excel_file.parse(sheet_name)

                    # Log the first few rows for inspection
                    logging.info(f"Successfully read {len(sheet.index)} rows.")

                    logging.info("Running SQL generation...")
                    llm_result = sheet.apply(run_sql, axis=1, args=(routing_service,))
                    sheet = sheet.join(llm_result)
                    sheet["executed"] = sheet.apply(
                        lambda row: row["generated_sql"] is not None, axis=1
                    )
                    # Save results
                    sheet.to_excel(writer, sheet_name=sheet_name, index=False)
            logging.info(f"All sheets successfully written to '{output_path}'")

        except FileNotFoundError:
            logging.error(f"Error: The Excel file was not found at '{file_path}'")
        except Exception as e:
            logging.error(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    bench_coverage_test()
