// Script to update turf image_url values in the live SQLite database to use local SVG files
const db = require('../backend/config/db');

db.query("UPDATE TURF SET image_url='/assets/images/champions-arena.svg' WHERE turf_id=1");
db.query("UPDATE TURF SET image_url='/assets/images/wembley-turf.svg' WHERE turf_id=2");
db.query("UPDATE TURF SET image_url='/assets/images/kickoff-ground.svg' WHERE turf_id=3");
db.query("UPDATE TURF SET image_url='/assets/images/premier-hub.svg' WHERE turf_id=4");
db.query("UPDATE TURF SET image_url='/assets/images/greenvalley.svg' WHERE turf_id=5");

const rows = db.query('SELECT turf_id, turf_name, image_url FROM TURF');
console.log('Updated image URLs:');
rows.forEach(r => console.log(` Turf ${r.turf_id}: ${r.turf_name} => ${r.image_url}`));
console.log('Done!');
process.exit(0);
