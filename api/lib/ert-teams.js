// api/lib/ert-teams.js
const EN_TO_EL = {
  "Mexico": ["Μεξικό"],
  "South Africa": ["Νότια Αφρική"],
  "South Korea": ["Νότια Κορέα", "Κορέα"],
  "Czechia": ["Τσεχία"],
  "Canada": ["Καναδάς"],
  "Bosnia & Herzegovina": ["Βοσνία-Ερζεγοβίνη", "Βοσνία"],
  "United States": ["ΗΠΑ", "Ηνωμένες Πολιτείες"],
  "Paraguay": ["Παραγουάη"],
  "Qatar": ["Κατάρ"],
  "Switzerland": ["Ελβετία"],
  "Brazil": ["Βραζιλία"],
  "Morocco": ["Μαρόκο"],
  "Haiti": ["Αϊτή"],
  "Scotland": ["Σκωτία"],
  "Australia": ["Αυστραλία"],
  "Türkiye": ["Τουρκία"],
  "Germany": ["Γερμανία"],
  "Curaçao": ["Κουρασάο"],
  "Netherlands": ["Ολλανδία", "Κάτω Χώρες"],
  "Japan": ["Ιαπωνία"],
  "Ivory Coast": ["Ακτή Ελεφαντοστού"],
  "Ecuador": ["Εκουαδόρ"],
  "Sweden": ["Σουηδία"],
  "Tunisia": ["Τυνησία"],
  "Spain": ["Ισπανία"],
  "Cape Verde": ["Πράσινο Ακρωτήριο", "Πράσινο Ακρωτήρι"],
  "Belgium": ["Βέλγιο"],
  "Egypt": ["Αίγυπτος"],
  "Iran": ["Ιράν"],
  "New Zealand": ["Νέα Ζηλανδία"],
  "Saudi Arabia": ["Σαουδική Αραβία"],
  "Uruguay": ["Ουρουγουάη"],
  "France": ["Γαλλία"],
  "Senegal": ["Σενεγάλη"],
  "Norway": ["Νορβηγία"],
  "Iraq": ["Ιράκ"],
  "Argentina": ["Αργεντινή"],
  "Algeria": ["Αλγερία"],
  "Austria": ["Αυστρία"],
  "Jordan": ["Ιορδανία"],
  "Portugal": ["Πορτογαλία"],
  "Uzbekistan": ["Ουζμπεκιστάν"],
  "Colombia": ["Κολομβία"],
  "Congo DR": ["ΛΔ Κονγκό", "Κονγκό"],
  "England": ["Αγγλία"],
  "Croatia": ["Κροατία"],
  "Ghana": ["Γκάνα"],
  "Panama": ["Παναμάς"],
};

const normalizeGreek = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

module.exports = { EN_TO_EL, normalizeGreek };
