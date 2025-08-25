# api/llm_routes.py
from flask import Blueprint, request, jsonify, current_app
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
llm_bp = Blueprint("llm", __name__)


@llm_bp.route("/generate", methods=["POST"])
def generate():
    """Basic text generation interface"""
    try:
        data = request.get_json()

        if not data or "prompt" not in data:
            return jsonify({"success": False, "error": "prompt field is required"}), 400

        response = current_app.llm_service.generate(
            prompt=data["prompt"],
            model=data.get("model"),
            provider=data.get("provider"),
            temperature=data.get("temperature", 0.7),
            max_tokens=data.get("max_tokens", 1000),
            system_prompt=data.get("system_prompt"),
        )

        return jsonify(
            {
                "success": True,
                "content": response.content,
                "model_used": response.model_used,
                "tokens_used": response.tokens_used,
            }
        )
    except Exception as e:
        logger.error(f"Unknown error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500


@llm_bp.route("/providers", methods=["GET"])
def list_providers():
    """List available providers"""
    try:
        providers = current_app.llm_service.list_providers()
        return jsonify(
            {
                "success": True,
                "providers": providers,
                "default": current_app.llm_service.default_provider,
            }
        )
    except Exception as e:
        logger.error(f"Error getting provider list: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
