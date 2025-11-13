.PHONY: help use-storychat use-jimmylai status restart-nginx

help: ## Show this help message
	@echo ""
	@echo "App Switcher - Quick Commands"
	@echo "=============================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

use-storychat: ## Switch to storychat at /app
	@bash switch-app.sh storychat

use-jimmylai: ## Switch to jimmylai at /app
	@bash switch-app.sh jimmylai

status: ## Show currently active app
	@echo ""
	@if [ -L nginx.conf ]; then \
		ACTIVE=$$(readlink nginx.conf | sed 's/.*nginx.conf.//'); \
		echo "✓ Currently active: $$ACTIVE"; \
		echo "  Access at: http://localhost:7272/app"; \
	else \
		echo "⚠ No active app (nginx.conf is not a symlink)"; \
	fi
	@echo ""

restart-nginx: ## Restart nginx container
	@echo "🔄 Restarting nginx..."
	@docker-compose restart nginx
	@echo "✅ Done"

# Aliases for convenience
storychat: use-storychat ## Alias for use-storychat
jimmylai: use-jimmylai ## Alias for use-jimmylai
