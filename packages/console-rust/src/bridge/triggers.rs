use iii_sdk::{III, IIIError};
use serde_json::json;
use tracing::{debug, info};

/// Most triggers use HTTP GET method. The invoke endpoint uses POST.
pub fn register_triggers(bridge: &III) -> Result<(), IIIError> {
    let triggers = vec![
        ("console.status", "_console/status", "GET"),
        ("console.health", "_console/health", "GET"),
        ("console.functions", "_console/functions", "GET"),
        ("console.triggers", "_console/triggers", "GET"),
        ("console.trigger_types", "_console/trigger-types", "GET"),
        ("console.workers", "_console/workers", "GET"),
        ("console.alerts_list", "_console/alerts", "GET"),
        ("console.sampling_rules", "_console/sampling/rules", "GET"),
        ("console.otel_logs_list", "_console/otel/logs", "POST"),
        (
            "console.otel_logs_clear",
            "_console/otel/logs/clear",
            "POST",
        ),
        ("console.otel_traces_list", "_console/otel/traces", "POST"),
        (
            "console.otel_traces_clear",
            "_console/otel/traces/clear",
            "POST",
        ),
        (
            "console.otel_traces_tree",
            "_console/otel/traces/tree",
            "POST",
        ),
        (
            "console.metrics_detailed",
            "_console/metrics/detailed",
            "POST",
        ),
        ("console.rollups_list", "_console/rollups", "POST"),
        // State management endpoints - use state module exclusively
        (
            "console.state_groups_list",
            "_console/states/groups",
            "GET",
        ),
        (
            "console.state_group_items",
            "_console/states/group",
            "POST",
        ),
        (
            "console.state_item_set",
            "_console/states/:group/item",
            "POST",
        ),
        (
            "console.state_item_delete",
            "_console/states/:group/item/:key",
            "DELETE",
        ),
        // Streams discovery (separate from state)
        (
            "console.streams_list",
            "_console/streams/list",
            "GET",
        ),
    ];

    // Register each trigger with the bridge
    for (function_path, api_path, method) in triggers {
        let config = json!({
            "api_path": api_path,
            "http_method": method
        });

        debug!("Registering API trigger: {} -> {}", api_path, function_path);

        bridge.register_trigger("api", function_path, config)?;

        info!(
            "Successfully registered API trigger: {} -> {}",
            api_path, function_path
        );
    }

    Ok(())
}
