const url = "https://firestore.googleapis.com/v1/projects/taka---projec-1/databases/(default)/documents/artifacts/taka-projects-app-v1/public/data/taka_settings/layout_trigger";

fetch(url)
  .then(res => res.text())
  .then(console.log)
  .catch(console.error);
