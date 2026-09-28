# ThousandEyes Network Path implementation status

- [x] Scaffold a Dynatrace App for the supplied environment.
- [x] Add trace input, fixed time windows, and Grail span query.
- [x] Convert parent span relationships to a service graph.
- [x] Render the graph and query states.
- [x] Accept a `trace_id` intent.
- [x] Add test-name lookup and recent trace selection.
- [x] Load observed tests into a searchable dropdown.
- [x] Build and lint locally.
- [ ] Compare graph links with the trace waterfall in the live tenant.
- [ ] Confirm whether Distributed Tracing exposes the custom intent through Open with.
- [x] Deploy to hkw74641 and confirm that the app page opens.
- [x] Confirm test-name search, recent trace selection, and graph rendering in hkw74641.
- [x] Confirm the test dropdown loads, selecting a test lists traces, and selecting a trace renders its graph in hkw74641.
