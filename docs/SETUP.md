# Install ThousandEyes Network Path in a Dynatrace environment

This guide installs the app in a Dynatrace environment that already receives ThousandEyes Network Path spans. The app reads spans from Grail and renders a graph for one selected trace. It does not install a ThousandEyes stream or change Smartscape topology.

## 1. Prepare the trace data

Ensure your ThousandEyes Network Path stream sends OpenTelemetry traces to the Dynatrace environment where you will install the app. For direct OTLP/HTTP ingestion, Dynatrace documents the traces endpoint as `https://<environment-id>.live.dynatrace.com/api/v2/otlp/v1/traces`. The ingest credential and setup for the stream are separate from the app's read permissions. See [Dynatrace OTLP API endpoints](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api).

In Dynatrace Distributed Tracing or a Notebook, confirm that recent spans have:

- `trace.id` and `span.id`
- `thousandeyes.test.name` and ideally `thousandeyes.test.id`
- `dt.smartscape.service` for the spans you want to show as nodes
- `span.parent_id` where you want the app to connect nodes across services

You can run the same test discovery query used by the app in a Dynatrace Notebook:

```dql
fetch spans, from: now() - 24h
| filter isNotNull(thousandeyes.test.name)
| summarize lastSeen = max(start_time), by: {testName = thousandeyes.test.name, testId = toString(thousandeyes.test.id)}
| sort lastSeen desc
| limit 10000
```

If this query returns no records, check the ThousandEyes stream, the destination environment, your Grail access, and the timeframe before deploying the app. The test dropdown lists tests **observed in Grail** within the selected 2 hour, 24 hour, or 7 day window. It does not query the ThousandEyes configured-test inventory, so a test without matching spans will not be listed.

## 2. Check Dynatrace access

The app declares these read scopes in [`app.config.json`](../app.config.json):

| Scope | Purpose |
| --- | --- |
| `storage:buckets:read` | Read Grail buckets used for span queries |
| `storage:spans:read` | Find tests and traces, and read the selected trace's spans |
| `storage:smartscape:read` | Resolve Smartscape service node names |

The person deploying the app needs permission to deploy Dynatrace Apps. People using the app also need access to the relevant Grail spans and Smartscape data. If the discovery query works for one user but the app is empty for another, compare their data access and any active segment or timeframe restrictions. See [Dynatrace Grail permissions](https://docs.dynatrace.com/docs/discover-dynatrace/platform/grail/data-model/assign-permissions-in-grail).

The app does not require a ThousandEyes API token. It reads the ThousandEyes attributes already present in Dynatrace spans.

## 3. Point the app at your environment

Install [Node.js 24](https://nodejs.org/) and clone the repository:

```bash
git clone https://github.com/ajimenez1503/thousandeyes-network-path.git
cd thousandeyes-network-path
npm ci
```

Set `environmentUrl` in [`app.config.json`](../app.config.json) to your Dynatrace Apps URL, for example `https://abc12345.apps.dynatrace.com/`. Keep the existing `app.id` if you want the same app ID in a different environment. If your environment already has an app with this ID and version, choose a unique ID or increase the app version before deploying an update.

You can also override the target without editing the file:

```bash
npm run deploy -- --environment-url https://abc12345.apps.dynatrace.com/
```

This target is the **Apps** URL. It differs from the `.live.dynatrace.com` URL used for OTLP ingestion.

## 4. Build and deploy

```bash
npm run build
npm run lint
npm run deploy
```

The App Toolkit opens a browser for Dynatrace sign-in when needed. If you used the `--environment-url` override in step 3, use it on the deploy command here as well. See the [Dynatrace App Toolkit guide](https://developer.dynatrace.com/quickstart/app-toolkit/) for CLI requirements and deployment options.

After deployment, open `https://<environment-id>.apps.dynatrace.com/ui/apps/my.trace.path.map/`. If you changed `app.id`, replace `my.trace.path.map` in this URL with your chosen ID.

## 5. Open a trace path

1. Choose a search window. The default is 24 hours.
2. Open the searchable ThousandEyes test dropdown and choose a test.
3. Choose one of the 30 most recent traces shown for that test.
4. Inspect the service nodes and connections. You can also paste a 32-character trace ID into **Or enter a trace ID** and select **Show path**.

![Searchable test dropdown](images/test-dropdown.jpg)

![Trace service path](images/trace-path-graph.jpg)

The app can also accept its `view-trace-path` intent with a `trace_id` from another Dynatrace app. The trace ID input remains available when a source app does not provide that intent.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No tests in the dropdown | Confirm recent spans contain `thousandeyes.test.name`, increase the search window to 7 days, and check Grail read access. |
| A configured test is missing | The dropdown reads Grail, not the ThousandEyes test inventory. The test needs spans in the selected window. |
| A test has no trace choices | Confirm its `thousandeyes.test.id` or name matches the ingested spans, and check the selected window. |
| A selected trace has no nodes | Confirm its spans have `dt.smartscape.service` and that the trace is still in retention. |
| Some connections are missing | The graph follows `span.parent_id` between spans assigned to different `dt.smartscape.service` values. Missing parent spans or service IDs leave gaps. |
| The app loads for one user but not another | Check both the app scopes and that user's Grail and Smartscape data access. |

The app reads at most 10,000 spans for a trace and shows a notice when the result reaches that limit. It derives edges from parent span relationships, so they may differ from the built-in Smartscape topology, which can include traffic from other traces.
