# Anak Bos Troika simulation

Serve this directory in a browser (rather than opening `index.html` directly), for example:

```sh
python3 -m http.server 8000
```

Then record the 720 × 1080 browser viewport at `http://localhost:8000/`.
The default simulation is `S1`. Select another folder under `simdata` with a query parameter, e.g. `http://localhost:8000/?simulation=S2`, or change `DEFAULT_SIMULATION` at the top of `app.js`.
