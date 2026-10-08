applyZoom();
load(true);
setInterval(() => { if (S) { load(); if (view) loadMsgs(); } }, 4000);
setInterval(pollCh, 2000);
setInterval(tick, 1000);
