# Metrics Setup - Remaining Steps

This document outlines what remains to be completed to fully finish the metrics implementation for the JWT Pizza Service.

## ✅ Completed

All code implementation has been completed:
- ✅ Added metrics configuration structure to `config.js`
- ✅ Created `metrics.js` with all required metrics tracking
- ✅ Modified CI pipeline to include metrics configuration
- ✅ Integrated metrics middleware into `service.js`
- ✅ Added auth metrics tracking to `authRouter.js`
- ✅ Added pizza purchase metrics tracking to `orderRouter.js`

## 🔧 Remaining Steps

### 1. Update Grafana Credentials in `src/config.js`

Replace the placeholder values in `src/config.js` with your actual Grafana Cloud credentials:

```javascript
metrics: {
  source: 'jwt-pizza-service-dev',  // Keep this for dev environment
  url: 'https://otlp-gateway-prod-us-east-2.grafana.net/otlp/v1/metrics',  // Replace with your actual Grafana OTLP endpoint
  apiKey: 'YOUR_USER_ID:glc_YOUR_API_KEY'  // Replace with your actual API key (format: USER_ID:glc_API_KEY)
}
```

**How to get your Grafana credentials:**
1. Log into your Grafana Cloud account
2. Navigate to **Connections** → **Add new connection** → **OpenTelemetry**
3. Copy the OTLP endpoint URL (should look like `https://otlp-gateway-prod-REGION.grafana.net/otlp/v1/metrics`)
4. Create or use an existing API key:
   - Go to **Administration** → **API Keys**
   - Create a new API key with **Metrics Publisher** role
   - The API key format is `USER_ID:glc_API_KEY`

### 2. Add GitHub Secrets for CI/CD

Add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `METRICS_URL`: Your Grafana OTLP endpoint URL (same as in config.js)
   - `METRICS_API_KEY`: Your Grafana API key (same as in config.js)

**Note:** The production source in CI will be `jwt-pizza-service` (without `-dev` suffix) as configured in `.github/workflows/ci.yml`.

### 3. Create Grafana Dashboard

After your service is running and sending metrics, create a Grafana dashboard with the following panels:

#### Panel 1: HTTP Requests by Method/Minute

**Query:**
```
http_requests_per_minute{source="jwt-pizza-service-dev"}
```

**Visualization:** Time series graph
**Legend:** `{{method}}`
**Y-axis:** Requests per minute

**Sub-panels:**
- Total requests: `http_requests_per_minute{source="jwt-pizza-service-dev",method="TOTAL"}`
- GET requests: `http_requests_per_minute{source="jwt-pizza-service-dev",method="GET"}`
- POST requests: `http_requests_per_minute{source="jwt-pizza-service-dev",method="POST"}`
- PUT requests: `http_requests_per_minute{source="jwt-pizza-service-dev",method="PUT"}`
- DELETE requests: `http_requests_per_minute{source="jwt-pizza-service-dev",method="DELETE"}`

#### Panel 2: Active Users

**Query:**
```
active_users{source="jwt-pizza-service-dev"}
```

**Note:** If Grafana shows the metric as `active_users_ratio` (due to unit interpretation), you can either:
- Query it as: `active_users_ratio{source="jwt-pizza-service-dev"}`
- Or wait for the metric to update with the new unit ('1' instead of 'users')

**Visualization:** Stat panel or time series
**Unit:** Count (not a ratio - this is the number of currently signed in users)

#### Panel 3: Authentication Attempts/Minute

**Query:**
```
auth_attempts_per_minute{source="jwt-pizza-service-dev"}
```

**Visualization:** Time series graph
**Legend:** `{{status}}`
**Y-axis:** Attempts per minute

**Sub-panels:**
- Successful: `auth_attempts_per_minute{source="jwt-pizza-service-dev",status="successful"}`
- Failed: `auth_attempts_per_minute{source="jwt-pizza-service-dev",status="failed"}`

#### Panel 4: CPU and Memory Usage Percentage

**Query (CPU):**
```
cpu_usage_percentage{source="jwt-pizza-service-dev"}
```

**Query (Memory):**
```
memory_usage_percentage{source="jwt-pizza-service-dev"}
```

**Visualization:** Time series graph (both on same panel with dual Y-axis)
**Unit:** Percent (0-100)
**Y-axis:** Percentage

#### Panel 5: Pizza Metrics

**Query (Pizzas Sold/Minute):**
```
pizzas_sold_per_minute{source="jwt-pizza-service-dev"}
```

**Query (Creation Failures/Minute):**
```
pizza_creation_failures_per_minute{source="jwt-pizza-service-dev"}
```

**Query (Revenue/Minute):**
```
pizza_revenue_per_minute{source="jwt-pizza-service-dev"}
```

**Visualization:** Time series graph (can be separate panels or combined)
**Y-axis:** 
- Pizzas sold: Count per minute
- Failures: Count per minute
- Revenue: Amount per minute

#### Panel 6: Latency Metrics

**⚠️ IMPORTANT:** Latency metrics only appear **after** you've generated traffic to your service. They won't show up in Grafana's metric browser until at least one request has been made.

**Query (Service Endpoint Latency):**
```
endpoint_latency_ms{source="jwt-pizza-service-dev"}
```

**Query (Pizza Creation Latency):**
```
pizza_creation_latency_ms{source="jwt-pizza-service-dev"}
```

**Visualization:** Time series graph
**Legend:** `{{endpoint}}` for endpoint latency
**Unit:** Milliseconds
**Y-axis:** Latency in ms

**Note:** 
- For endpoint latency, you may want separate series for each endpoint or a single graph showing all endpoints
- If you don't see these metrics, make some HTTP requests to your service first (GET, POST, PUT, DELETE)
- Pizza creation latency only appears after you've created at least one pizza order

### 4. Dashboard Configuration Details

**Dashboard Settings:**
- **Title:** "JWT Pizza Service Metrics"
- **Time Range:** Last 1 hour (default)
- **Refresh:** 10s (to match metric reporting interval)
- **Min Interval:** 10s (in Query options for each panel)

**Panel Configuration Tips:**
1. Set **Min interval** to `10s` in Query options for all panels
2. All metrics are gauge type showing per-minute values directly (no rate calculation needed)
3. Use **Legend** customization to show meaningful labels (e.g., `{{method}}`, `{{status}}`, `{{endpoint}}`)
4. Enable **Show points** for better visibility of data points
5. Use appropriate **Y-axis** units and scales (requests/min, attempts/min, etc.)

### 5. Make Dashboard Public

Once your dashboard is created and working:

1. Navigate to your dashboard in Grafana
2. Make sure you're not in edit mode (click "Exit edit" if needed)
3. Click the **Share** button (top right)
4. Select **Share externally**
5. Acknowledge the warning
6. **Enable** the following settings:
   - ✅ Allow viewers to change time range
   - ✅ Allow viewers to display annotations
7. Copy the public URL
8. Test the URL in an incognito window to verify it works

### 6. Export Dashboard JSON

1. In your dashboard, click **Share**
2. Go to the **Export** tab
3. Click **Save to file**
4. Save the file as `grafana/deliverable8dashboard.json` in your repository
5. Commit and push the file

### 7. Verify Metrics Are Being Sent

**⚠️ IMPORTANT:** After updating the code, you **MUST restart your service** for changes to take effect!

To verify metrics are working:

1. **Restart your service:**
   - Stop the current service (Ctrl+C)
   - Start it again: `npm start`
   - Wait 10-20 seconds for the first metrics to be sent

2. **Check that all metrics exist in Grafana:**
   - Go to Grafana Cloud → **Explore** → Select your Prometheus data source
   - Click the **Metrics browser** or use the metric name dropdown
   - You should now see ALL these metrics (even if they're 0):
     - `http_requests_per_minute` (with labels: method=GET, POST, PUT, DELETE, TOTAL)
     - `auth_attempts_per_minute` (with labels: status=successful, failed)
     - `active_users`
     - `cpu_usage_percentage`
     - `memory_usage_percentage`
     - `pizzas_sold_per_minute`
     - `pizza_creation_failures_per_minute`
     - `pizza_revenue_per_minute`
     - `endpoint_latency_ms` (only appears after traffic)
     - `pizza_creation_latency_ms` (only appears after pizza orders)

3. **Generate traffic** (you mentioned you have an external script for this):
   - Make HTTP requests (GET, POST, PUT, DELETE)
   - Try logging in/registering users (generates auth metrics)
   - Create pizza orders (generates pizza and latency metrics)
   - **Wait at least 10-20 seconds** after generating traffic for metrics to be sent

4. **Test queries in Explore:**
   - All metrics are now gauge type (per-minute values), so query directly:
     - `http_requests_per_minute{source="jwt-pizza-service-dev"}`
     - `auth_attempts_per_minute{source="jwt-pizza-service-dev"}`
     - `active_users{source="jwt-pizza-service-dev"}`
   - Set time range to "Last 15 minutes" or "Last 1 hour"

### 8. Production Environment

Remember that:
- **Development** uses source: `jwt-pizza-service-dev`
- **Production** (via CI/CD) uses source: `jwt-pizza-service`

You may want to create separate dashboards or use variables to filter between environments.

## Metric Names Reference

All metrics are sent with the `source` attribute. Here's a complete list:

| Metric Name | Type | Description | Attributes |
|------------|------|-------------|------------|
| `http_requests_per_minute` | Gauge | HTTP requests per minute | `method` (GET, POST, PUT, DELETE, TOTAL), `source` |
| `auth_attempts_per_minute` | Gauge | Authentication attempts per minute | `status` (successful, failed), `source` |
| `active_users` | Gauge | Count of currently signed in users | `source` |
| `cpu_usage_percentage` | Gauge | CPU usage percentage | `source` |
| `memory_usage_percentage` | Gauge | Memory usage percentage | `source` |
| `pizzas_sold_per_minute` | Gauge | Pizzas sold per minute | `source` |
| `pizza_creation_failures_per_minute` | Gauge | Pizza creation failures per minute | `source` |
| `pizza_revenue_per_minute` | Gauge | Revenue per minute | `source` |
| `endpoint_latency_ms` | Gauge | Average endpoint latency | `endpoint`, `source` |
| `pizza_creation_latency_ms` | Gauge | Average pizza creation latency | `source` |

## Troubleshooting

**All metrics showing 0 (except CPU/Memory):**
1. **Did you restart your service?** After code changes, you must restart: `npm start`
2. **Are you generating traffic?** Metrics will be 0 if there's no traffic:
   - Make HTTP requests to your service
   - Try logging in/registering (for auth metrics)
   - Create pizza orders (for pizza metrics)
3. **Wait for metrics to send:** Metrics are sent every 10 seconds, so wait 10-20 seconds after generating traffic
4. **Check the queries:** All metrics are now gauge type (per-minute values), so query directly:
   - ✅ `http_requests_per_minute{source="jwt-pizza-service-dev"}` - Correct
   - ✅ `auth_attempts_per_minute{source="jwt-pizza-service-dev"}` - Correct
   - ✅ `pizzas_sold_per_minute{source="jwt-pizza-service-dev"}` - Correct

**Latency metrics not appearing:**
1. **Latency metrics only appear AFTER traffic:** They won't show up in Grafana's metric browser until you've made at least one request
2. **Generate traffic first:**
   - Make some HTTP requests (any endpoint)
   - Create a pizza order (for pizza creation latency)
   - Wait 10-20 seconds
3. **Check in Explore:** Try querying `endpoint_latency_ms{source="jwt-pizza-service-dev"}` after generating traffic

**No metrics appearing in Grafana at all:**
1. Verify your API key and URL are correct in `config.js`
2. Check service console logs for errors like "Error pushing metrics"
3. Ensure the service is running and has been restarted after code changes
4. Verify the `source` attribute matches your queries exactly: `jwt-pizza-service-dev`

**Active users showing as `active_users_ratio` or flat value:**
1. **Check the actual metric name in Grafana:**
   - Go to **Explore** → **Metrics browser**
   - Look for `active_users` or `active_users_ratio`
   - Use whichever name appears in the browser
2. **Restart your service** after the code change (unit changed from 'users' to '1')
3. **Wait for new data:** The old metric might still be cached - wait 10-20 seconds for new metrics to appear
4. **Query directly:** Try both `active_users{source="jwt-pizza-service-dev"}` and `active_users_ratio{source="jwt-pizza-service-dev"}` to see which works
5. **If value is flat:** This means the metric isn't updating - verify the service is running and check service logs

**HTTP requests not dropping to 0 when traffic stops:**
1. **Check Grafana visualization settings:**
   - In panel settings, go to **Visualization** → **Draw mode**
   - Make sure it's set to **Lines** or **Bars** (not "Connected" which can show stale values)
   - Check **Null value** handling - set to **null** or **connected** (not "last")
2. **Verify metrics are being sent:** Check that 0 values are actually being sent when there's no traffic
3. **Check time range:** Make sure your time range includes the period after traffic stopped
4. **Refresh dashboard:** Metrics are sent every 10 seconds, so wait a bit and refresh
5. **Check in Explore:** Query `http_requests_per_minute{source="jwt-pizza-service-dev"}` directly to see if 0 values are present

**Metrics showing but dashboard queries return "No data":**
1. Check the time range (should include when metrics were sent - try "Last 1 hour")
2. Verify the `source` filter matches exactly: `{source="jwt-pizza-service-dev"}`
3. All metrics are gauge type, so query directly (no `rate()` needed)
4. Check that the data source is correctly configured in Grafana (should be Prometheus)
5. Try queries in Explore view first to test them
6. Verify you're using the new metric names (e.g., `http_requests_per_minute` not `http_requests_total`)

## Next Steps Summary

1. ✅ Code implementation - **DONE**
2. ⏳ Add real Grafana URL and API key to `config.js`
3. ⏳ Add `METRICS_URL` and `METRICS_API_KEY` secrets to GitHub
4. ⏳ Create Grafana dashboard with all required panels
5. ⏳ Configure dashboard queries and visualizations
6. ⏳ Make dashboard public
7. ⏳ Export dashboard JSON to `grafana/deliverable8dashboard.json`
8. ⏳ Test with traffic simulation
9. ⏳ Verify all metrics show nonzero data

Once these steps are complete, your metrics observability implementation will be fully functional!

