export const content = {
  de: {
    languageName: "Deutsch",
    nav: {
      what: "Was ist T00L?",
      volumina: "Volumina",
      modules: "Erweiterung",
      app: "App öffnen",
      footerInfo: "Info",
      themeLight: "Hell",
      themeDark: "Dunkel",
      language: "Sprache wechseln",
    },
    hero: {
      eyebrow: "Textfiles. Modular. Erweiterbar gedacht.",
      title: "einfache Oberfläche, standardisierte Berechnungen.",
      description:
        "T00L arbeitet mit lesbaren TXT/TOML-Dateien statt schwerfälliger Bedienoberflächen/GUI.",
      primary: "App öffnen",
      secondary: "Was ist T00L?",
      warmupPreparing: "App wird im Hintergrund vorbereitet",
      warmupReady: "App ist bereit",
      warmupUnavailable: "App-Warmup ist noch nicht konfiguriert",
    },
    what: {
      label: "Was ist T00L?",
      title: "Textfiles. Verarbeitung. Berechnung.",
      restoredTitle: "Textfiles. Verarbeitung. Berechnung.",
      body:
        "Eine einfache Oberfläche führt durch den Ablauf, während Module die Berechnung kapseln.",
      inputTitle: "Input",
      outputTitle: "Output",
      centerLabel: "T00L berechnet",
      steps: [
        {
          title: "1. Beispiel laden",
          body: "Ein Modul liefert ein Template mit sinnvollen Startwerten.",
        },
        {
          title: "2. Input anpassen",
          body: "Werte können einfach angepasst werden.",
        },
        {
          title: "3. Berechnung durchführen",
          body: "Parser prüfen die Eingabe, das Modul erzeugt nachvollziehbare Ergebnisse.",
        },
        {
          title: "4. Ergebnis nutzen",
          body: "Output, Tabellen und Vorschauen werden erstellt und können exportiert werden.",
        },
      ],
      workflows: [
        {
          stepTitle: "Beispielmodul: Startwerte anpassen",
          badge: "Workflow A",
          inputCode: `name = "Example"
module = "starter"

[calculation]
mode = "guided"
value = 42.0
unit = "mm"`,
          adjustedInputCode: `name = "Example"
module = "starter"

[calculation]
mode = "guided"
value = 86.5
unit = "mm"`,
          highlightOldValue: "42.0",
          highlightNewValue: "86.5",
          outputCode: `Example module result

validation = "passed"
calculation = "complete"
next_step = "adapt template"`,
        },
      ],
    },
    demo: {
      label: "Beispielmodul",
      title: "Volumina für Füllstandsberechnungen.",
      body:
        "Volumina berechnet Füllhöhen, Volumenprofile, Füllvolumen, Behältervolumen und technische Kennwerte für rotationssymmetrische Behälter.",
      inputTitle: "Input",
      outputTitle: "Output",
      previewTitle: "Profil",
      inputCode: `name = "Volumina"
module = "vessel_volume"

[profile]
shape = "horizontal_tank"
diameter_mm = 2200
length_mm = 4200
heads = "kloepper"`,
      outputCode: `Example module result

validation = "passed"
calculation = "complete"

[summary]
fill_height = "calculated"
filled_volume = "calculated"
profile = "traceable"`,
    },
    modules: {
      label: "Weitere T00L-Module kommen",
      title: "Volumina ist erst der Anfang ...",
      body:
        "T00L ist als gemeinsame Oberfläche für weitere Berechnungen gedacht: neue Templates, Parser, Ergebnisformate und Vorschauen können als Module folgen.",
      cards: [
        "Weitere Engineering-Templates",
        "Modulare Parser und Validierung",
        "Neue Ergebnisansichten",
        "Mehr Beispiele als Startpunkt",
      ],
    },
    footer: {
      disclaimer:
        "Für die Software und ihre Ergebnisse wird keine Gewähr übernommen. Verwendung auf eigene Gefahr.",
      github: "GitHub",
      email: "E-Mail",
    },
  },

  en: {
    languageName: "English",
    nav: {
      what: "What is T00L?",
      volumina: "Volumina",
      modules: "Expansion",
      app: "Launch app",
      footerInfo: "Info",
      themeLight: "Light",
      themeDark: "Dark",
      language: "Switch language",
    },
    hero: {
      eyebrow: "Text files. Modular. Built to expand.",
      title: "simple interface, standardized calculations.",
      description:
        "T00L works with readable TXT/TOML files instead of heavyweight user interfaces/GUI.",
      primary: "Open app",
      secondary: "What is T00L?",
      warmupPreparing: "Starting the app in the background",
      warmupReady: "App is ready",
      warmupUnavailable: "App warmup is not configured yet",
    },
    what: {
      label: "What is T00L?",
      title: "Text files. Processing. Calculation.",
      restoredTitle: "Text files. Processing. Calculation.",
      body:
        "A simple interface guides the workflow while modules encapsulate the calculation.",
      inputTitle: "Input",
      outputTitle: "Output",
      centerLabel: "T00L calculates",
      steps: [
        {
          title: "1. Load example",
          body: "A module provides a template with sensible starting values.",
        },
        {
          title: "2. Adjust input",
          body: "Values can be adjusted directly.",
        },
        {
          title: "3. Run calculation",
          body: "Parsers validate the input, then the module creates traceable results.",
        },
        {
          title: "4. Use output",
          body: "Output, tables, and previews are created and can be exported.",
        },
      ],
      workflows: [
        {
          stepTitle: "Example module: check starting values",
          badge: "Workflow A",
          inputCode: `name = "Example"
module = "starter"

[calculation]
mode = "guided"
value = 42.0
unit = "mm"`,
          adjustedInputCode: `name = "Example"
module = "starter"

[calculation]
mode = "guided"
value = 86.5
unit = "mm"`,
          highlightOldValue: "42.0",
          highlightNewValue: "86.5",
          outputCode: `Example module result

validation = "passed"
calculation = "complete"
next_step = "adapt template"`,
        },
      ],
    },
    demo: {
      label: "Example module",
      title: "Volumina for fill level calculations.",
      body:
        "Volumina calculates fill heights, volume profiles, filled volume, vessel volume, and engineering values for rotationally symmetric vessels.",
      inputTitle: "Input",
      outputTitle: "Output",
      previewTitle: "Profile preview",
      inputCode: `name = "Volumina"
module = "vessel_volume"

[profile]
shape = "horizontal_tank"
diameter_mm = 2200
length_mm = 4200
heads = "kloepper"`,
      outputCode: `Example module result

validation = "passed"
calculation = "complete"

[summary]
fill_height = "calculated"
filled_volume = "calculated"
profile = "traceable"`,
    },
    modules: {
      label: "More T00L modules are coming",
      title: "Volumina is only the beginning ...",
      body:
        "T00L is designed as a shared surface for more calculations: new templates, parsers, result formats, and previews can follow as modules.",
      cards: [
        "More engineering templates",
        "Modular parsers and validation",
        "New result views",
        "More examples as starting points",
      ],
    },
    footer: {
      disclaimer:
        "No warranty is provided for this software or its results. Verify engineering outputs before use.",
      github: "GitHub",
      email: "Email",
    },
  },
};
