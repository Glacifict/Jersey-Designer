import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

type Pattern =
  | "none"
  | "stripes-vertical"
  | "pinstripes"
  | "hoops"
  | "halves"
  | "quarters"
  | "sash"
  | "gradient"
  | "custom";

const W = 520;
const H = 680;

type BodyType = "man" | "woman";

const translations: Record<string, Record<string, string>> = {
  fr: { colors: "Couleurs", pattern: "Motif", sponsors: "Sponsors", player: "Joueur", save: "Sauvegarder", open: "Ouvrir", exportPng: "Exporter PNG", exportStl: "Exporter STL", exportGlb: "Exporter GLB", person: "Personne", man: "Homme", woman: "Femme", primary: "Principale", secondary: "Motif", trim: "Bordures", collar: "Col", none: "Aucun", logo: "Logo", sponsor: "Sponsor", export: "Exporter", rotateHint: "Glisser pour tourner, molette pour zoomer", posX: "Position X", posY: "Position Y", size: "Taille", removeImage: "Supprimer image", imageSize: "Taille image", text: "Texte", textColor: "Couleur texte", textSize: "Taille texte", image: "Image", sponsorLeft: "Sponsor epaule gauche", sponsorRight: "Sponsor epaule droite", sponsorUnder: "Sponsor sous numero", backNameNumber: "Dos - Nom et numero", name: "Nom", nameColor: "Couleur nom", nameSize: "Taille nom", nameY: "Position Y nom", number: "Numero", numberColor: "Couleur numero", numberSize: "Taille numero", numberY: "Position Y numero", outline: "Contour", frontSponsor: "Sponsor avant", logoFront: "Logo (avant)" , gradient: "Degrade", custom: "Personnalise" , file: "Fichier", settings: "Parametres", unsavedTitle: "Modifications non sauvegardees", saveAndQuit: "Sauvegarder et quitter", quitWithoutSaving: "Quitter sans sauvegarder", cancel: "Annuler" },
  en: { colors: "Colors", pattern: "Pattern", sponsors: "Sponsors", player: "Player", save: "Save", open: "Open", exportPng: "Export PNG", exportStl: "Export STL", exportGlb: "Export GLB", person: "Person", man: "Man", woman: "Woman", primary: "Primary", secondary: "Secondary", trim: "Trim", collar: "Collar", none: "None", logo: "Logo", sponsor: "Sponsor", export: "Export", rotateHint: "Drag to rotate, scroll to zoom", posX: "Position X", posY: "Position Y", size: "Size", removeImage: "Remove image", imageSize: "Image size", text: "Text", textColor: "Text color", textSize: "Text size", image: "Image", sponsorLeft: "Left shoulder sponsor", sponsorRight: "Right shoulder sponsor", sponsorUnder: "Sponsor under number", backNameNumber: "Back - Name and number", name: "Name", nameColor: "Name color", nameSize: "Name size", nameY: "Name Y", number: "Number", numberColor: "Number color", numberSize: "Number size", numberY: "Number Y", outline: "Outline", frontSponsor: "Front sponsor", logoFront: "Logo (front)" , gradient: "Gradient", custom: "Custom" , file: "File", settings: "Settings", unsavedTitle: "Unsaved changes", saveAndQuit: "Save and quit", quitWithoutSaving: "Quit without saving", cancel: "Cancel" },
  de: { colors: "Farben", pattern: "Muster", sponsors: "Sponsoren", player: "Spieler", save: "Speichern", open: "Öffnen", exportPng: "PNG exportieren", exportStl: "STL exportieren", exportGlb: "GLB exportieren", person: "Person", man: "Mann", woman: "Frau", primary: "Primär", secondary: "Sekundär", trim: "Bordüre", collar: "Kragen", none: "Keine", logo: "Logo", sponsor: "Sponsor", export: "Exportieren", rotateHint: "Ziehen zum Drehen, Scrollen zum Zoomen", posX: "Position X", posY: "Position Y", size: "Größe", removeImage: "Bild entfernen", imageSize: "Bildgröße", text: "Text", textColor: "Textfarbe", textSize: "Textgröße", image: "Bild", sponsorLeft: "Linker Schulter-Sponsor", sponsorRight: "Rechter Schulter-Sponsor", sponsorUnder: "Sponsor unter Nummer", backNameNumber: "Rücken - Name und Nummer", name: "Name", nameColor: "Namensfarbe", nameSize: "Namensgröße", nameY: "Name Y", number: "Nummer", numberColor: "Nummernfarbe", numberSize: "Nummerngröße", numberY: "Nummer Y", outline: "Kontur", frontSponsor: "Front-Sponsor", logoFront: "Logo (vorne)", gradient: "Verlauf", custom: "Benutzerdefiniert" , file: "Datei", settings: "Einstellungen", unsavedTitle: "Ungespeicherte Änderungen", saveAndQuit: "Speichern und beenden", quitWithoutSaving: "Beenden ohne Speichern", cancel: "Abbrechen" },
  es: { colors: "Colores", pattern: "Patrón", sponsors: "Patrocinadores", player: "Jugador", save: "Guardar", open: "Abrir", exportPng: "Exportar PNG", exportStl: "Exportar STL", exportGlb: "Exportar GLB", person: "Persona", man: "Hombre", woman: "Mujer", primary: "Principal", secondary: "Secundario", trim: "Bordes", collar: "Cuello", none: "Ninguno", logo: "Logo", sponsor: "Patrocinador", export: "Exportar", rotateHint: "Arrastrar para girar, rueda para zoom", posX: "Posición X", posY: "Posición Y", size: "Tamaño", removeImage: "Eliminar imagen", imageSize: "Tamaño imagen", text: "Texto", textColor: "Color texto", textSize: "Tamaño texto", image: "Imagen", sponsorLeft: "Patrocinador hombro izq.", sponsorRight: "Patrocinador hombro der.", sponsorUnder: "Patrocinador bajo número", backNameNumber: "Espalda - Nombre y número", name: "Nombre", nameColor: "Color nombre", nameSize: "Tamaño nombre", nameY: "Nombre Y", number: "Número", numberColor: "Color número", numberSize: "Tamaño número", numberY: "Número Y", outline: "Contorno", frontSponsor: "Patrocinador frontal", logoFront: "Logo (frontal)", gradient: "Degradado", custom: "Personalizado" , file: "Archivo", settings: "Configuracion", unsavedTitle: "Cambios sin guardar", saveAndQuit: "Guardar y salir", quitWithoutSaving: "Salir sin guardar", cancel: "Cancelar" },
  it: { colors: "Colori", pattern: "Motivo", sponsors: "Sponsor", player: "Giocatore", save: "Salva", open: "Apri", exportPng: "Esporta PNG", exportStl: "Esporta STL", exportGlb: "Esporta GLB", person: "Persona", man: "Uomo", woman: "Donna", primary: "Primario", secondary: "Secondario", trim: "Bordi", collar: "Collo", none: "Nessuno", logo: "Logo", sponsor: "Sponsor", export: "Esporta", rotateHint: "Trascina per ruotare, scroll per zoom", posX: "Posizione X", posY: "Posizione Y", size: "Dimensione", removeImage: "Rimuovi immagine", imageSize: "Dimensione immagine", text: "Testo", textColor: "Colore testo", textSize: "Dimensione testo", image: "Immagine", sponsorLeft: "Sponsor spalla sx", sponsorRight: "Sponsor spalla dx", sponsorUnder: "Sponsor sotto numero", backNameNumber: "Retro - Nome e numero", name: "Nome", nameColor: "Colore nome", nameSize: "Dimensione nome", nameY: "Nome Y", number: "Numero", numberColor: "Colore numero", numberSize: "Dimensione numero", numberY: "Numero Y", outline: "Contorno", frontSponsor: "Sponsor frontale", logoFront: "Logo (frontale)", gradient: "Sfumatura", custom: "Personalizzato" , file: "File", settings: "Impostazioni", unsavedTitle: "Modifiche non salvate", saveAndQuit: "Salva ed esci", quitWithoutSaving: "Esci senza salvare", cancel: "Annulla" },
  nl: { colors: "Kleuren", pattern: "Patroon", sponsors: "Sponsors", player: "Speler", save: "Opslaan", open: "Openen", exportPng: "PNG exporteren", exportStl: "STL exporteren", exportGlb: "GLB exporteren", person: "Persoon", man: "Man", woman: "Vrouw", primary: "Primair", secondary: "Secundair", trim: "Rand", collar: "Kraag", none: "Geen", logo: "Logo", sponsor: "Sponsor", export: "Exporteren", rotateHint: "Slepen om te draaien, scrollen om te zoomen", posX: "Positie X", posY: "Positie Y", size: "Grootte", removeImage: "Afbeelding verwijderen", imageSize: "Afbeeldingsgrootte", text: "Tekst", textColor: "Tekstkleur", textSize: "Tekstgrootte", image: "Afbeelding", sponsorLeft: "Linker schouder sponsor", sponsorRight: "Rechter schouder sponsor", sponsorUnder: "Sponsor onder nummer", backNameNumber: "Rug - Naam en nummer", name: "Naam", nameColor: "Naamkleur", nameSize: "Naamgrootte", nameY: "Naam Y", number: "Nummer", numberColor: "Nummerkleur", numberSize: "Nummergrootte", numberY: "Nummer Y", outline: "Omlijning", frontSponsor: "Front sponsor", logoFront: "Logo (voorkant)", gradient: "Verloop", custom: "Aangepast" , file: "Bestand", settings: "Instellingen", unsavedTitle: "Niet-opgeslagen wijzigingen", saveAndQuit: "Opslaan en afsluiten", quitWithoutSaving: "Afsluiten zonder opslaan", cancel: "Annuleren" },
  sv: { colors: "Färger", pattern: "Mönster", sponsors: "Sponsorer", player: "Spelare", save: "Spara", open: "Öppna", exportPng: "Exportera PNG", exportStl: "Exportera STL", exportGlb: "Exportera GLB", person: "Person", man: "Man", woman: "Kvinna", primary: "Primär", secondary: "Sekundär", trim: "Kant", collar: "Krage", none: "Ingen", logo: "Logo", sponsor: "Sponsor", export: "Exportera", rotateHint: "Dra för att rotera, scrolla för zoom", posX: "Position X", posY: "Position Y", size: "Storlek", removeImage: "Ta bort bild", imageSize: "Bildstorlek", text: "Text", textColor: "Textfärg", textSize: "Textstorlek", image: "Bild", sponsorLeft: "Vänster axel sponsor", sponsorRight: "Höger axel sponsor", sponsorUnder: "Sponsor under nummer", backNameNumber: "Ryggen - Namn och nummer", name: "Namn", nameColor: "Namnfärg", nameSize: "Namnstorlek", nameY: "Namn Y", number: "Nummer", numberColor: "Nummerfärg", numberSize: "Nummerstorlek", numberY: "Nummer Y", outline: "Kontur", frontSponsor: "Front sponsor", logoFront: "Logo (framsida)", gradient: "Gradient", custom: "Anpassad" , file: "Arkiv", settings: "Inställningar", unsavedTitle: "Osparade ändringar", saveAndQuit: "Spara och avsluta", quitWithoutSaving: "Avsluta utan att spara", cancel: "Avbryt" },
  no: { colors: "Farger", pattern: "Mønster", sponsors: "Sponsorer", player: "Spiller", save: "Lagre", open: "Åpne", exportPng: "Eksporter PNG", exportStl: "Eksporter STL", exportGlb: "Eksporter GLB", person: "Person", man: "Mann", woman: "Kvinne", primary: "Primær", secondary: "Sekundær", trim: "Kant", collar: "Krage", none: "Ingen", logo: "Logo", sponsor: "Sponsor", export: "Eksporter", rotateHint: "Dra for å rotere, scroll for zoom", posX: "Posisjon X", posY: "Posisjon Y", size: "Størrelse", removeImage: "Fjern bilde", imageSize: "Bildestørrelse", text: "Tekst", textColor: "Tekstfarge", textSize: "Tekststørrelse", image: "Bilde", sponsorLeft: "Venstre skulder sponsor", sponsorRight: "Høyre skulder sponsor", sponsorUnder: "Sponsor under nummer", backNameNumber: "Ryggen - Navn og nummer", name: "Navn", nameColor: "Navnfarge", nameSize: "Navnstørrelse", nameY: "Navn Y", number: "Nummer", numberColor: "Nummerfarge", numberSize: "Nummerstørrelse", numberY: "Nummer Y", outline: "Kontur", frontSponsor: "Front sponsor", logoFront: "Logo (forside)", gradient: "Gradient", custom: "Egendefinert" , file: "Fil", settings: "Innstillinger", unsavedTitle: "Ulagrede endringer", saveAndQuit: "Lagre og avslutt", quitWithoutSaving: "Avslutt uten å lagre", cancel: "Avbryt" },
};


function ColorSwatch({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const colors = ["#1e3a8a", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#f97316", "#ffffff", "#111827", "#6b7280", "#facc15", "#fb7185", "#34d399", "#60a5fa", "#a78bfa"];
  return (
    <div className="swatch-picker">
      <button className="color-rect" style={{ background: value }} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div className="palette">
          {colors.map((c) => (
            <button key={c} className="swatch" style={{ background: c }} onClick={() => { onChange(c); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraStateRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  // jersey design
  const [primary, setPrimary] = useState("#1e3a8a");
  const [secondary, setSecondary] = useState("#ffffff");
  const [trim, setTrim] = useState("#facc15");
  const [collar, setCollar] = useState("#111827");
  const [pattern, setPattern] = useState<Pattern>("stripes-vertical");
  const [customPatternData, setCustomPatternData] = useState<string | null>(null);
  const [patternImageVersion, setPatternImageVersion] = useState(0);

  // person
  const [bodyType, setBodyType] = useState<BodyType>("man");
  const [lang, setLang] = useState("fr");
  const [tab, setTab] = useState<"colors" | "pattern" | "sponsors" | "player">("colors");
  const [theme, setTheme] = useState("dark");
  const t = (key: string) => (translations[lang] && translations[lang][key]) || translations.fr[key] || key;
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const hasUnsavedRef = useRef(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  useEffect(() => { hasUnsavedRef.current = hasUnsaved; }, [hasUnsaved]);
  const initialRef = useRef(true);

  const fileInputRef = useRef<HTMLInputElement>(null);


  const [colorTarget, setColorTarget] = useState<"primary" | "secondary" | "trim" | "collar">("primary");

  // logo (front)
  const [logoData, setLogoData] = useState<string | null>(null);
  const [logoX, setLogoX] = useState(0.5);
  const [logoY, setLogoY] = useState(0.78);
  const [logoScale, setLogoScale] = useState(0.5);

  // front sponsor
  const [sponsorText, setSponsorText] = useState("SPONSOR");
  const [sponsorColor, setSponsorColor] = useState("#ffffff");
  const [sponsorSize, setSponsorSize] = useState(50);
  const [sponsorY, setSponsorY] = useState(0.4);
  const [sponsorData, setSponsorData] = useState<string | null>(null);
  const [sponsorScale, setSponsorScale] = useState(0.6);

  // back
  const [backName, setBackName] = useState("NOM");
  const [backNameColor, setBackNameColor] = useState("#ffffff");
  const [backNameSize, setBackNameSize] = useState(60);
  const [backNameY, setBackNameY] = useState(0.75);
  const [backNumber, setBackNumber] = useState("10");
  const [backNumberColor, setBackNumberColor] = useState("#ffffff");
  const [backNumberSize, setBackNumberSize] = useState(220);
  const [backNumberY, setBackNumberY] = useState(0.55);
  const [backNameOutline, setBackNameOutline] = useState("#000000");
  const [backNumberOutline, setBackNumberOutline] = useState("#000000");

  // shoulder sponsors
  const [shoulderSponsorText, setShoulderSponsorText] = useState("SPONSOR");
  const [shoulderSponsorColor, setShoulderSponsorColor] = useState("#ffffff");
  const [shoulderSponsorSize, setShoulderSponsorSize] = useState(12);
  const [shoulderSponsorData, setShoulderSponsorData] = useState<string | null>(null);
  const [shoulderSponsorScale, setShoulderSponsorScale] = useState(0.12);

  const [shoulderLeftText, setShoulderLeftText] = useState("SPONSOR");
  const [shoulderLeftColor, setShoulderLeftColor] = useState("#ffffff");
  const [shoulderLeftSize, setShoulderLeftSize] = useState(40);
  const [shoulderLeftData, setShoulderLeftData] = useState<string | null>(null);
  const [shoulderLeftScale, setShoulderLeftScale] = useState(0.6);

  const [shoulderRightText, setShoulderRightText] = useState("SPONSOR");
  const [shoulderRightColor, setShoulderRightColor] = useState("#ffffff");
  const [shoulderRightSize, setShoulderRightSize] = useState(40);
  const [shoulderRightData, setShoulderRightData] = useState<string | null>(null);
  const [shoulderRightScale, setShoulderRightScale] = useState(0.6);

  // sponsor under number
  const [underSponsorText, setUnderSponsorText] = useState("SPONSOR");
  const [underSponsorColor, setUnderSponsorColor] = useState("#ffffff");
  const [underSponsorSize, setUnderSponsorSize] = useState(40);
  const [underSponsorData, setUnderSponsorData] = useState<string | null>(null);
  const [underSponsorScale, setUnderSponsorScale] = useState(0.45);
  const [underSponsorY, setUnderSponsorY] = useState(0.3);

  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [geometries, setGeometries] = useState<{ man: THREE.BufferGeometry | null; woman: THREE.BufferGeometry | null; child: THREE.BufferGeometry | null }>({
    man: null,
    woman: null,
    child: null,
  });
  const [modelsReady, setModelsReady] = useState(false);

  const [shirtGeometries, setShirtGeometries] = useState<{ man: THREE.BufferGeometry | null; woman: THREE.BufferGeometry | null; child: THREE.BufferGeometry | null }>({
    man: null,
    woman: null,
    child: null,
  });
  const [shirtsReady, setShirtsReady] = useState(false);

  useEffect(() => {
    const loader = new STLLoader();
    const files: Record<string, string> = {
      man: "/models/homme.stl",
      woman: "/models/femme.stl",
      child: "/models/enfant.stl",
    };
    const result: any = {};
    let remaining = 3;
    Object.entries(files).forEach(([key, url]) => {
      loader.load(
        url,
        (geo) => {
          geo.rotateX(-Math.PI / 2);
          geo.computeBoundingBox();
          const box = geo.boundingBox!;
          const center = box.getCenter(new THREE.Vector3());
          geo.translate(-center.x, -box.min.y, -center.z);
          result[key] = geo;
          remaining -= 1;
          if (remaining === 0) {
            setGeometries({ man: result.man, woman: result.woman, child: result.child });
            setModelsReady(true);
          }
        },
        undefined,
        (err) => console.error("STL load error", err)
      );
    });
  }, []);

  useEffect(() => {
    const loader = new STLLoader();
    const files: Record<string, string> = {
      man: "/models/shirt_man.stl",
      woman: "/models/shirt_woman.stl",
      child: "/models/shirt_child.stl",
    };
    const result: any = {};
    let remaining = 3;
    Object.entries(files).forEach(([key, url]) => {
      loader.load(
        url,
        (geo) => {
          geo.rotateX(-Math.PI / 2);
          geo.computeBoundingBox();
          const box = geo.boundingBox!;
          const center = box.getCenter(new THREE.Vector3());
          geo.translate(-center.x, -box.min.y, -center.z);
          geo.computeBoundingBox();
          const h = geo.boundingBox!.max.y - geo.boundingBox!.min.y;
          const sc = 1.7 / h;
          const pos = geo.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            pos.setX(i, pos.getX(i) * sc);
            pos.setY(i, pos.getY(i) * sc);
            pos.setZ(i, pos.getZ(i) * sc);
          }
          pos.needsUpdate = true;
          result[key] = geo;
          remaining -= 1;
          if (remaining === 0) {
            setShirtGeometries({ man: result.man, woman: result.woman, child: result.child });
            setShirtsReady(true);
          }
        },
        undefined,
        (err) => console.error("Shirt STL load error", err)
      );
    });
  }, []);

  const handleImage = (file: File | null, setter: (v: string | null) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ---------- textures ----------
  const buildJerseyTexture = () => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = secondary;
    switch (pattern) {
      case "stripes-vertical":
        for (let x = 0; x < 512; x += 48) ctx.fillRect(x, 0, 24, 512);
        break;
      case "pinstripes":
        for (let x = 0; x < 512; x += 16) ctx.fillRect(x, 0, 3, 512);
        break;
      case "hoops":
        for (let y = 0; y < 512; y += 56) ctx.fillRect(0, y, 512, 28);
        break;
      case "halves":
        ctx.fillRect(0, 0, 256, 512);
        break;
      case "quarters":
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillRect(256, 256, 256, 256);
        break;
      case "sash":
        ctx.save();
        ctx.translate(256, 256);
        ctx.rotate(-0.55);
        ctx.fillRect(-30, -320, 60, 640);
        ctx.restore();
        break;
      default:
        break;
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const makeTextTexture = (text: string, color: string, size: number, w = 512, h = 128) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 6;
    ctx.fillText(text.toUpperCase(), w / 2, h / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const makeImageTexture = (data: string | null) => {
    if (!data) return null;
    const img = new Image();
    img.src = data;
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    img.onload = () => {
      t.needsUpdate = true;
    };
    return t;
  };

  useEffect(() => {
    if (initialRef.current) { initialRef.current = false; return; }
    setHasUnsaved(true);
  }, [primary, secondary, trim, collar, pattern, bodyType, logoData, logoX, logoY, logoScale, sponsorText, sponsorColor, sponsorSize, sponsorY, sponsorData, sponsorScale, backName, backNameColor, backNameSize, backNameY, backNumber, backNumberColor, backNumberSize, backNumberY, backNameOutline, backNumberOutline, shoulderLeftText, shoulderLeftColor, shoulderLeftSize, shoulderLeftData, shoulderLeftScale, shoulderRightText, shoulderRightColor, shoulderRightSize, shoulderRightData, shoulderRightScale, underSponsorText, underSponsorColor, underSponsorSize, underSponsorData, underSponsorScale, underSponsorY, lang, theme]);

  useEffect(() => {
    invoke("set_unsaved", { state: hasUnsaved });
  }, [hasUnsaved]);

  useEffect(() => {
    let unlistenPromise = listen("close-requested", async () => {
      setShowCloseModal(true);
    });
    return () => { unlistenPromise.then((f) => f()); };
  }, []);

  // ---------- 3D scene ----------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!modelsReady || !shirtsReady) return;
    const bodyGeo = geometries[bodyType === "man" ? "man" : bodyType === "woman" ? "woman" : "child"];
    const shirtGeo = shirtGeometries[bodyType === "man" ? "man" : bodyType === "woman" ? "woman" : "child"];
    if (!bodyGeo || !shirtGeo) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1220");

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 1.0, 7.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.1, 0);
    if (cameraStateRef.current) {
      camera.position.copy(cameraStateRef.current.pos);
      controls.target.copy(cameraStateRef.current.target);
    }
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    controls.minDistance = 3.0;
    controls.maxDistance = 12.0;

    // lights
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 6, 5);
    dir.castShadow = true;
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.35);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const logoTex = makeImageTexture(logoData);
    const sponsorTex = makeImageTexture(sponsorData);
    const shoulderTex = makeImageTexture(shoulderSponsorData);
    const underTex = makeImageTexture(underSponsorData);

    const spec = {
      man: { h: 1.8, shoulderR: 0.2, chestR: 0.17, waistR: 0.15, hipR: 0.16, armR: 0.045, foreR: 0.038, thighR: 0.08, calfR: 0.055, headR: 0.1 },
      woman: { h: 1.65, shoulderR: 0.18, chestR: 0.17, waistR: 0.13, hipR: 0.18, armR: 0.042, foreR: 0.035, thighR: 0.085, calfR: 0.055, headR: 0.095 },
      child: { h: 1.2, shoulderR: 0.14, chestR: 0.13, waistR: 0.12, hipR: 0.14, armR: 0.038, foreR: 0.03, thighR: 0.06, calfR: 0.045, headR: 0.09 },
    }[bodyType];

    const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.6 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });

    const shirtPos = shirtGeo.attributes.position;
    const sBox = new THREE.Box3().setFromBufferAttribute(shirtPos as THREE.BufferAttribute);
    const sMinX = sBox.min.x, sMaxX = sBox.max.x;
    const sMinY = sBox.min.y, sMaxY = sBox.max.y;
    const sMinZ = sBox.min.z, sMaxZ = sBox.max.z;
const shirtWidth = sMaxX - sMinX;
const shirtHeight = sMaxY - sMinY;
const centerX = (sMinX + sMaxX) / 2;
const centerZ = (sMinZ + sMaxZ) / 2;

    // UVs based on X/Y for straighter pattern lines
    const uv = new Float32Array(shirtPos.count * 2);
    for (let i = 0; i < shirtPos.count; i++) {
      uv[i * 2] = (shirtPos.getX(i) - sMinX) / (sMaxX - sMinX);
      uv[i * 2 + 1] = (shirtPos.getY(i) - sMinY) / (sMaxY - sMinY);
    }
    shirtGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    // texture with straight pattern
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 1024;
    texCanvas.height = 1024;
    const tctx = texCanvas.getContext("2d")!;
    tctx.fillStyle = primary;
    tctx.fillRect(0, 0, 1024, 1024);
    tctx.fillStyle = secondary;
    switch (pattern) {
      case "stripes-vertical":
        for (let x = 0; x < 1024; x += 64) tctx.fillRect(x, 0, 32, 1024);
        break;
      case "pinstripes":
        for (let x = 0; x < 1024; x += 32) tctx.fillRect(x, 0, 4, 1024);
        break;
      case "hoops":
        for (let y = 0; y < 1024; y += 128) tctx.fillRect(0, y, 1024, 64);
        break;
      case "halves":
        tctx.fillRect(0, 0, 512, 1024);
        break;
      case "quarters":
        tctx.fillRect(0, 0, 512, 512);
        tctx.fillRect(512, 512, 512, 512);
        break;
      case "sash":
        tctx.save();
        tctx.translate(512, 512);
        tctx.rotate(-0.55);
        tctx.fillRect(-60, -640, 120, 1280);
        tctx.restore();
        break;
      case "gradient": {
        const grad = tctx.createLinearGradient(0, 0, 0, 1024);
        grad.addColorStop(0, primary);
        grad.addColorStop(1, secondary);
        tctx.fillStyle = grad;
        tctx.fillRect(0, 0, 1024, 1024);
        break;
      }
      case "custom":
        if (customPatternData) {
          const img = new Image();
          img.src = customPatternData;
          if (img.complete) {
            const tileSize = 256;
            for (let y = 0; y < 1024; y += tileSize) {
              for (let x = 0; x < 1024; x += tileSize) {
                tctx.drawImage(img, x, y, tileSize, tileSize);
              }
            }
          } else {
            img.onload = () => setPatternImageVersion((v) => v + 1);
          }
        }
        break;
      default:
        break;
    }
    const jerseyTex = new THREE.CanvasTexture(texCanvas);
    (jerseyTex as any).colorSpace = THREE.SRGBColorSpace;
    jerseyTex.minFilter = THREE.NearestFilter;
    jerseyTex.magFilter = THREE.NearestFilter;
    jerseyTex.generateMipmaps = false;
    jerseyTex.needsUpdate = true;

    const shirtMatTex = new THREE.MeshStandardMaterial({ map: jerseyTex, color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide });
    const shirtMesh = new THREE.Mesh(shirtGeo.clone(), shirtMatTex);
    shirtMesh.castShadow = true;
    shirtMesh.receiveShadow = true;
    shirtMesh.renderOrder = 2;
    const body = new THREE.Group();
    body.add(shirtMesh);

    // collar
    const collarMesh = new THREE.Mesh(new (THREE as any).TorusGeometry(0.18, 0.02, 10, 40), new THREE.MeshStandardMaterial({ color: collar }));
    collarMesh.position.y = sMaxY * 0.9;
    collarMesh.rotation.x = Math.PI / 2;
    body.add(collarMesh);

    const jerseyRadius = 0.2;

    // decals (same as before, scaled)
    const decals: { mesh: THREE.Mesh; kind: "front" | "back" | "side"; section: string }[] = [];
    const addPlane = (texture: THREE.Texture | null, text: string | null, color: string, size: number, x: number, y: number, z: number, yaw: number, w: number, h: number, outlineColor: string | null = null, section: string = "sponsors") => {
      let tex: THREE.Texture | null = texture;
      if (!tex && text && text.trim()) {
        const cw = 512;
        const ch = Math.max(128, Math.round(512 * (h / w)));
        const c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 6;
        if (outlineColor) {
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = Math.max(3, size / 6);
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(text.toUpperCase(), cw / 2, ch / 2);
        }
        ctx.fillStyle = color;
        ctx.fillText(text.toUpperCase(), cw / 2, ch / 2);
        tex = new THREE.CanvasTexture(c);
        (tex as any).colorSpace = THREE.SRGBColorSpace;
      }
      if (!tex) return;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.FrontSide, depthTest: true, depthWrite: false }));
      mesh.position.set(x, y, z);
      mesh.rotation.y = yaw;
      mesh.renderOrder = 10;
      body.add(mesh);
      const kind: "front" | "back" | "side" = Math.abs(yaw - Math.PI) < 0.1 ? "back" : Math.abs(yaw) < 0.1 ? "front" : "side";
      decals.push({ mesh, kind, section });
    };

    // front logo
    if (logoData) {
      const img = new Image(); img.src = logoData;
      const tex = new THREE.Texture(img); (tex as any).colorSpace = THREE.SRGBColorSpace; img.onload = () => { tex.needsUpdate = true; };
      addPlane(tex, null, "#fff", 0, centerX + (logoX - 0.5) * shirtWidth * 0.9, sMinY + logoY * shirtHeight, sMaxZ + 0.1, 0, logoScale * shirtWidth * 1.0, logoScale * shirtWidth * 1.0);
    }
    // front sponsor
    if (sponsorData) {
      const img = new Image(); img.src = sponsorData;
      const tex = new THREE.Texture(img); (tex as any).colorSpace = THREE.SRGBColorSpace; img.onload = () => { tex.needsUpdate = true; };
      const w = sponsorScale * 1.2; const h = w * 0.4;
      addPlane(tex, null, sponsorColor, sponsorSize, centerX, sMinY + sponsorY * shirtHeight, sMaxZ + 0.1, 0, w, h);
    } else if (sponsorText.trim()) {
      addPlane(null, sponsorText, sponsorColor, sponsorSize, centerX, sMinY + sponsorY * shirtHeight, sMaxZ + 0.1, 0, shirtWidth * 0.8, shirtHeight * 0.16);
    }

    // back name + number
    const backZ = sMinZ - 0.1;
    // flip back decals to face outward if needed
    const backRotation = Math.PI;
    if (backName.trim()) {
      addPlane(null, backName, backNameColor, backNameSize, 0, backNameY * sMaxY, backZ, Math.PI, 1.0, 0.25, backNameOutline, "player");
    }
    if (backNumber.trim()) {
      addPlane(null, backNumber, backNumberColor, backNumberSize, 0, backNumberY * sMaxY, backZ, Math.PI, 0.9, 0.45, backNumberOutline, "player");
    }
    const underY = underSponsorY * sMaxY;
    if (underSponsorData) {
      const img = new Image(); img.src = underSponsorData;
      const tex = new THREE.Texture(img); (tex as any).colorSpace = THREE.SRGBColorSpace; img.onload = () => { tex.needsUpdate = true; };
      const w = underSponsorScale * 1.2; const h = w * 0.4;
      addPlane(tex, null, underSponsorColor, underSponsorSize, centerX, sMinY + underSponsorY * shirtHeight, backZ, Math.PI, w, h);
    } else if (underSponsorText.trim()) {
      addPlane(null, underSponsorText, underSponsorColor, underSponsorSize, centerX, sMinY + underSponsorY * shirtHeight, backZ, Math.PI, shirtWidth * 0.7, shirtHeight * 0.18);
    }

    // shoulder sponsors (independent)
    // left
    if (shoulderLeftData) {
      const img = new Image(); img.src = shoulderLeftData;
      const tex = new THREE.Texture(img); (tex as any).colorSpace = THREE.SRGBColorSpace; img.onload = () => { tex.needsUpdate = true; };
      const w = shoulderLeftScale * 1.2; const h = w * 0.4;
      addPlane(tex, null, shoulderLeftColor, shoulderLeftSize, sMaxX + 0.02, 0.85 * sMaxY, centerZ, Math.PI / 2, w, h);
    } else if (shoulderLeftText.trim()) {
      addPlane(null, shoulderLeftText, shoulderLeftColor, shoulderLeftSize, sMaxX + 0.02, 0.85 * sMaxY, centerZ, Math.PI / 2, 0.4, 0.16);
    }
    // right
    if (shoulderRightData) {
      const img = new Image(); img.src = shoulderRightData;
      const tex = new THREE.Texture(img); (tex as any).colorSpace = THREE.SRGBColorSpace; img.onload = () => { tex.needsUpdate = true; };
      const w = shoulderRightScale * 1.2; const h = w * 0.4;
      addPlane(tex, null, shoulderRightColor, shoulderRightSize, sMinX - 0.02, 0.85 * sMaxY, centerZ, -Math.PI / 2, w, h);
    } else if (shoulderRightText.trim()) {
      addPlane(null, shoulderRightText, shoulderRightColor, shoulderRightSize, sMinX - 0.02, 0.85 * sMaxY, centerZ, -Math.PI / 2, 0.4, 0.16);
    }

    scene.add(body);
    (container as any).__shirtMesh = shirtMesh;
    (container as any).__scene = scene;

    const raycaster = new THREE.Raycaster();
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const meshes = decals.map((d) => d.mesh);
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const decal = decals.find((d) => d.mesh === hit);
        if (decal) setTab(decal.section as any);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        camera.aspect = r.width / r.height;
        camera.updateProjectionMatrix();
        renderer.setSize(r.width, r.height);
      }
    });
    ro.observe(container);

    // store renderer globally for export
    (container as any).__renderer = renderer;

    return () => {
      cameraStateRef.current = { pos: camera.position.clone(), target: controls.target.clone() };
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("click", onClick);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      (container as any).__renderer = null;
      (container as any).__shirtMesh = null;
      (container as any).__scene = null;
    };
  }, [
    primary,
    secondary,
    trim,
    collar,
    pattern,
    bodyType,
    logoData,
    logoX,
    logoY,
    logoScale,
    sponsorText,
    sponsorColor,
    sponsorSize,
    sponsorY,
    sponsorData,
    sponsorScale,
    backName,
    backNameColor,
    backNameSize,
    backNameY,
    backNumber,
    backNumberColor,
    backNumberSize,
    backNumberY,
    shoulderSponsorText,
    shoulderSponsorColor,
    shoulderSponsorSize,
    shoulderSponsorData,
    shoulderSponsorScale,
    underSponsorText,
    underSponsorColor,
    underSponsorSize,
    underSponsorData,
    underSponsorScale,
    underSponsorY,
    backNameOutline,
    backNumberOutline,
    shoulderLeftText,
    shoulderLeftColor,
    shoulderLeftSize,
    shoulderLeftData,
    shoulderLeftScale,
    shoulderRightText,
    shoulderRightColor,
    shoulderRightSize,
    shoulderRightData,
    shoulderRightScale,
    modelsReady,
    shirtsReady,
    customPatternData,
    patternImageVersion,
  ]);

  const exportPng = async () => {
    const container = containerRef.current;
    const renderer = container ? (container as any).__renderer : null;
    if (!renderer) return;
    const data = renderer.domElement.toDataURL("image/png");
    try {
      const path = await invoke<string>("export_png", { data });
      setExportMsg(`PNG enregistre : ${path}`);
    } catch (e) {
      const link = document.createElement("a");
      link.download = "jersey.png";
      link.href = data;
      link.click();
      setExportMsg("PNG telecharge.");
    }
  };

  const saveProject = async () => {
    const state = {
      primary, secondary, trim, collar, pattern, bodyType, logoData, logoX, logoY, logoScale,
      sponsorText, sponsorColor, sponsorSize, sponsorY, sponsorData, sponsorScale,
      backName, backNameColor, backNameSize, backNameY, backNumber, backNumberColor, backNumberSize, backNumberY,
      backNameOutline, backNumberOutline,
      shoulderLeftText, shoulderLeftColor, shoulderLeftSize, shoulderLeftData, shoulderLeftScale,
      shoulderRightText, shoulderRightColor, shoulderRightSize, shoulderRightData, shoulderRightScale,
      underSponsorText, underSponsorColor, underSponsorSize, underSponsorData, underSponsorScale, underSponsorY,
      lang,
    };
    try {
      let path = currentFilePath;
      if (!path) {
        path = await save({ filters: [{ name: "JSON", extensions: ["json"] }], defaultPath: "jersey-project.json" });
        if (!path) return;
        setCurrentFilePath(path);
      }
      await invoke("save_project_to", { path, data: JSON.stringify(state) });
      setHasUnsaved(false);
      setExportMsg(`Projet sauvegarde : ${path}`);
    } catch (e) {
      setExportMsg("Erreur sauvegarde.");
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveProject]);

  const saveAndQuit = async () => {
    await saveProject();
    await invoke("set_unsaved", { state: false });
    await invoke("force_quit");
  };

  const quitWithoutSaving = async () => {
    await invoke("set_unsaved", { state: false });
    await invoke("force_quit");
  };

  const openProject = async () => {
    try {
      const path = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
      if (!path || Array.isArray(path)) return;
      const text = await invoke<string>("read_project_file", { path });
      const st = JSON.parse(text);
      if (st.primary !== undefined) setPrimary(st.primary);
      if (st.secondary !== undefined) setSecondary(st.secondary);
      if (st.trim !== undefined) setTrim(st.trim);
      if (st.collar !== undefined) setCollar(st.collar);
      if (st.pattern !== undefined) setPattern(st.pattern);
      if (st.bodyType !== undefined) setBodyType(st.bodyType);
      if (st.logoData !== undefined) setLogoData(st.logoData);
      if (st.logoX !== undefined) setLogoX(st.logoX);
      if (st.logoY !== undefined) setLogoY(st.logoY);
      if (st.logoScale !== undefined) setLogoScale(st.logoScale);
      if (st.sponsorText !== undefined) setSponsorText(st.sponsorText);
      if (st.sponsorColor !== undefined) setSponsorColor(st.sponsorColor);
      if (st.sponsorSize !== undefined) setSponsorSize(st.sponsorSize);
      if (st.sponsorY !== undefined) setSponsorY(st.sponsorY);
      if (st.sponsorData !== undefined) setSponsorData(st.sponsorData);
      if (st.sponsorScale !== undefined) setSponsorScale(st.sponsorScale);
      if (st.backName !== undefined) setBackName(st.backName);
      if (st.backNameColor !== undefined) setBackNameColor(st.backNameColor);
      if (st.backNameSize !== undefined) setBackNameSize(st.backNameSize);
      if (st.backNameY !== undefined) setBackNameY(st.backNameY);
      if (st.backNumber !== undefined) setBackNumber(st.backNumber);
      if (st.backNumberColor !== undefined) setBackNumberColor(st.backNumberColor);
      if (st.backNumberSize !== undefined) setBackNumberSize(st.backNumberSize);
      if (st.backNumberY !== undefined) setBackNumberY(st.backNumberY);
      if (st.backNameOutline !== undefined) setBackNameOutline(st.backNameOutline);
      if (st.backNumberOutline !== undefined) setBackNumberOutline(st.backNumberOutline);
      if (st.shoulderLeftText !== undefined) setShoulderLeftText(st.shoulderLeftText);
      if (st.shoulderLeftColor !== undefined) setShoulderLeftColor(st.shoulderLeftColor);
      if (st.shoulderLeftSize !== undefined) setShoulderLeftSize(st.shoulderLeftSize);
      if (st.shoulderLeftData !== undefined) setShoulderLeftData(st.shoulderLeftData);
      if (st.shoulderLeftScale !== undefined) setShoulderLeftScale(st.shoulderLeftScale);
      if (st.shoulderRightText !== undefined) setShoulderRightText(st.shoulderRightText);
      if (st.shoulderRightColor !== undefined) setShoulderRightColor(st.shoulderRightColor);
      if (st.shoulderRightSize !== undefined) setShoulderRightSize(st.shoulderRightSize);
      if (st.shoulderRightData !== undefined) setShoulderRightData(st.shoulderRightData);
      if (st.shoulderRightScale !== undefined) setShoulderRightScale(st.shoulderRightScale);
      if (st.underSponsorText !== undefined) setUnderSponsorText(st.underSponsorText);
      if (st.underSponsorColor !== undefined) setUnderSponsorColor(st.underSponsorColor);
      if (st.underSponsorSize !== undefined) setUnderSponsorSize(st.underSponsorSize);
      if (st.underSponsorData !== undefined) setUnderSponsorData(st.underSponsorData);
      if (st.underSponsorScale !== undefined) setUnderSponsorScale(st.underSponsorScale);
      if (st.underSponsorY !== undefined) setUnderSponsorY(st.underSponsorY);
      if (st.lang !== undefined) setLang(st.lang);
      setCurrentFilePath(path);
      setHasUnsaved(false);
      setExportMsg("Projet charge.");
    } catch (e) {
      setExportMsg("Erreur chargement projet.");
    }
  };

  const exportStl = async () => {
    const container = containerRef.current;
    const mesh = container ? (container as any).__shirtMesh : null;
    if (!mesh) return;
    const geo = mesh.geometry;
    const pos = geo.attributes.position.array;
    const idx = geo.index ? geo.index.array : null;
    let stl = "solid jersey\n";
    const triCount = idx ? idx.length / 3 : pos.length / 9;
    for (let t = 0; t < triCount; t++) {
      let i0, i1, i2;
      if (idx) {
        i0 = idx[t * 3]; i1 = idx[t * 3 + 1]; i2 = idx[t * 3 + 2];
      } else {
        i0 = t * 3; i1 = t * 3 + 1; i2 = t * 3 + 2;
      }
      const ax = pos[i0 * 3], ay = pos[i0 * 3 + 1], az = pos[i0 * 3 + 2];
      const bx = pos[i1 * 3], by = pos[i1 * 3 + 1], bz = pos[i1 * 3 + 2];
      const cx = pos[i2 * 3], cy = pos[i2 * 3 + 1], cz = pos[i2 * 3 + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;
      stl += `facet normal ${nx} ${ny} ${nz}\n`;
      stl += "  outer loop\n";
      stl += `    vertex ${ax} ${ay} ${az}\n`;
      stl += `    vertex ${bx} ${by} ${bz}\n`;
      stl += `    vertex ${cx} ${cy} ${cz}\n`;
      stl += "  endloop\n";
      stl += "endfacet\n";
    }
    stl += "endsolid jersey\n";
    const b64 = btoa(unescape(encodeURIComponent(stl)));
    try {
      const path = await invoke<string>("export_stl", { data: b64 });
      setExportMsg(`STL enregistre : ${path}`);
    } catch (e) {
      setExportMsg("Erreur export STL.");
    }
  };

  const exportGlb = async () => {
    const container = containerRef.current;
    const scene = container ? (container as any).__scene : null;
    if (!scene) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      async (result) => {
        const buffer = result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        try {
          const path = await invoke<string>("export_glb", { data: b64 });
          setExportMsg(`GLB enregistre : ${path}`);
        } catch (e) {
          setExportMsg("Erreur export GLB.");
        }
      },
      (error) => {
        console.error(error);
        setExportMsg("Erreur export GLB.");
      },
      { binary: true, embedImages: true }
    );
  };

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".menubar")) setOpenMenu(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className={`layout ${theme}`}>
      {showCloseModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{t("unsavedTitle")}</p>
            <div className="modal-buttons">
              <button onClick={() => { setShowCloseModal(false); saveAndQuit(); }}>{t("saveAndQuit")}</button>
              <button onClick={() => { setShowCloseModal(false); quitWithoutSaving(); }}>{t("quitWithoutSaving")}</button>
              <button onClick={() => setShowCloseModal(false)}>{t("cancel")}</button>
            </div>
          </div>
        </div>
      )}
      <header className="topbar">
        {openMenu && <div className="menu-overlay" onClick={() => setOpenMenu(null)} />}
        <div className="menubar">
          <div className="menu-item">
            <button className="menu-btn" onClick={() => setOpenMenu(openMenu === "file" ? null : "file")}>{t("file")}</button>
            {openMenu === "file" && (
              <div className="menu-dropdown">
                <button onClick={() => { openProject(); setOpenMenu(null); }}>{t("open")}</button>
                <button onClick={() => { saveProject(); setOpenMenu(null); }}>{t("save")}</button>
                <div className="menu-separator" />
                <button onClick={() => { exportPng(); setOpenMenu(null); }}>{t("exportPng")}</button>
                <button onClick={() => { exportStl(); setOpenMenu(null); }}>{t("exportStl")}</button>
                <button onClick={() => { exportGlb(); setOpenMenu(null); }}>{t("exportGlb")}</button>
              </div>
            )}
          </div>
          <div className="menu-item">
            <button className="menu-btn" onClick={() => setOpenMenu(openMenu === "settings" ? null : "settings")}>{t("settings")}</button>
            {openMenu === "settings" && (
              <div className="menu-dropdown">
                <label>Langue
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className="lang-select">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                    <option value="nl">Nederlands</option>
                    <option value="sv">Svenska</option>
                    <option value="no">Norsk</option>
                  </select>
                </label>
                <label>Theme
                  <select value={theme} onChange={(e) => setTheme(e.target.value)} className="lang-select">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>
        <div className="tabs">

          <button className={tab === "colors" ? "tab active" : "tab"} onClick={() => setTab("colors")}>{t("colors")}</button>
          <button className={tab === "pattern" ? "tab active" : "tab"} onClick={() => setTab("pattern")}>{t("pattern")}</button>
          <button className={tab === "sponsors" ? "tab active" : "tab"} onClick={() => setTab("sponsors")}>{t("sponsors")}</button>
          <button className={tab === "player" ? "tab active" : "tab"} onClick={() => setTab("player")}>{t("player")}</button>
        </div>

        <div className="toppanel">
          {tab === "colors" && (
            <div className="topgrid">
              <section>
                <h2>{t("person")}</h2>
                <select value={bodyType} onChange={(e) => setBodyType(e.target.value as BodyType)}>
                  <option value="man">{t("man")}</option>
                  <option value="woman">{t("woman")}</option>
                </select>
              </section>
              <section>
                <h2>Principales</h2>
                <label>{t("primary")} <ColorSwatch value={primary} onChange={setPrimary} /></label>
                <label>{t("secondary")} <ColorSwatch value={secondary} onChange={setSecondary} /></label>
                <label>{t("trim")} <ColorSwatch value={trim} onChange={setTrim} /></label>
                <label>{t("collar")} <ColorSwatch value={collar} onChange={setCollar} /></label>
              </section>
              {exportMsg && <p className="hint">{exportMsg}</p>}
            </div>
          )}

          {tab === "pattern" && (
            <div className="topgrid">
              <section>
                <h2>{t("pattern")}</h2>
                <select value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
                  <option value="none">{t("none")}</option>
                  <option value="stripes-vertical">{t("stripesVertical")}</option>
                  <option value="pinstripes">{t("pinstripes")}</option>
                  <option value="hoops">{t("hoops")}</option>
                  <option value="halves">{t("halves")}</option>
                  <option value="quarters">{t("quarters")}</option>
                  <option value="sash">{t("sash")}</option>
                  <option value="gradient">{t("gradient")}</option>
                  <option value="custom">{t("custom")}</option>
                </select>
                {pattern === "custom" && (
                  <div>
                    <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0] ?? null, setCustomPatternData)} />
                    {customPatternData && <button onClick={() => setCustomPatternData(null)}>{t("removeImage")}</button>}
                  </div>
                )}
              </section>
              <section>
                <h2>{t("logoFront")}</h2>
                <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0] ?? null, setLogoData)} />
                {logoData && <button onClick={() => setLogoData(null)}>{t("removeImage")}</button>}
                <label>{t("posX")}<input type="range" min={0.1} max={0.9} step={0.01} value={logoX} onChange={(e) => setLogoX(+e.target.value)} /></label>
                <label>{t("posY")}<input type="range" min={0.4} max={0.95} step={0.01} value={logoY} onChange={(e) => setLogoY(+e.target.value)} /></label>
                <label>{t("size")}<input type="range" min={0.08} max={0.6} step={0.01} value={logoScale} onChange={(e) => setLogoScale(+e.target.value)} /></label>
              </section>
            </div>
          )}

          {tab === "sponsors" && (
            <div className="topgrid">
              <section>
                <h2>{t("frontSponsor")}</h2>
                <input type="text" value={sponsorText} onChange={(e) => setSponsorText(e.target.value)} placeholder="Nom sponsor" />
                <label>{t("textColor")} <ColorSwatch value={sponsorColor} onChange={setSponsorColor} /></label>
                <label>{t("textSize")}<input type="range" min={16} max={80} step={1} value={sponsorSize} onChange={(e) => setSponsorSize(+e.target.value)} /></label>
                <label>{t("posY")}<input type="range" min={0.2} max={0.8} step={0.01} value={sponsorY} onChange={(e) => setSponsorY(+e.target.value)} /></label>
                <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0] ?? null, setSponsorData)} />
                {sponsorData && <button onClick={() => setSponsorData(null)}>{t("removeImage")}</button>}
                <label>{t("imageSize")}<input type="range" min={0.15} max={0.45} step={0.01} value={sponsorScale} onChange={(e) => setSponsorScale(+e.target.value)} /></label>
              </section>

              <section>
                <h2>{t("sponsorLeft")}</h2>
                <input type="text" value={shoulderLeftText} onChange={(e) => setShoulderLeftText(e.target.value)} placeholder="Sponsor" />
                <label>{t("primary")} <ColorSwatch value={shoulderLeftColor} onChange={setShoulderLeftColor} /></label>
                <label>{t("size")}<input type="range" min={10} max={40} step={1} value={shoulderLeftSize} onChange={(e) => setShoulderLeftSize(+e.target.value)} /></label>
                <label>Image<input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0] ?? null, setShoulderLeftData)} /></label>
                {shoulderLeftData && <button onClick={() => setShoulderLeftData(null)}>{t("removeImage")}</button>}
                <label>{t("imageSize")}<input type="range" min={0.06} max={0.18} step={0.01} value={shoulderLeftScale} onChange={(e) => setShoulderLeftScale(+e.target.value)} /></label>
              </section>

              <section>
                <h2>{t("sponsorRight")}</h2>
                <input type="text" value={shoulderRightText} onChange={(e) => setShoulderRightText(e.target.value)} placeholder="Sponsor" />
                <label>{t("primary")} <ColorSwatch value={shoulderRightColor} onChange={setShoulderRightColor} /></label>
                <label>{t("size")}<input type="range" min={10} max={40} step={1} value={shoulderRightSize} onChange={(e) => setShoulderRightSize(+e.target.value)} /></label>
                <label>Image<input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0] ?? null, setShoulderRightData)} /></label>
                {shoulderRightData && <button onClick={() => setShoulderRightData(null)}>{t("removeImage")}</button>}
                <label>{t("imageSize")}<input type="range" min={0.06} max={0.18} step={0.01} value={shoulderRightScale} onChange={(e) => setShoulderRightScale(+e.target.value)} /></label>
              </section>

              <section>
                <h2>{t("sponsorUnder")}</h2>
                <input type="text" value={underSponsorText} onChange={(e) => setUnderSponsorText(e.target.value)} placeholder="Sponsor" />
                <label>{t("primary")} <ColorSwatch value={underSponsorColor} onChange={setUnderSponsorColor} /></label>
                <label>{t("size")}<input type="range" min={12} max={70} step={1} value={underSponsorSize} onChange={(e) => setUnderSponsorSize(+e.target.value)} /></label>
                <label>{t("posY")}<input type="range" min={0.2} max={0.7} step={0.01} value={underSponsorY} onChange={(e) => setUnderSponsorY(+e.target.value)} /></label>
                <label>Image<input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0] ?? null, setUnderSponsorData)} /></label>
                {underSponsorData && <button onClick={() => setUnderSponsorData(null)}>{t("removeImage")}</button>}
                <label>{t("imageSize")}<input type="range" min={0.12} max={0.35} step={0.01} value={underSponsorScale} onChange={(e) => setUnderSponsorScale(+e.target.value)} /></label>
              </section>
            </div>
          )}

          {tab === "player" && (
            <div className="topgrid">
              <section>
                <h2>{t("backNameNumber")}</h2>
                <label>{t("name")}<input type="text" value={backName} onChange={(e) => setBackName(e.target.value)} placeholder="NOM DU JOUEUR" /></label>
                <div className="color-row">
            <label>{t("nameColor")} <ColorSwatch value={backNameColor} onChange={setBackNameColor} /></label>
            <label>{t("outline")} <ColorSwatch value={backNameOutline} onChange={setBackNameOutline} /></label>
          </div>
                <label>{t("nameSize")}<input type="range" min={14} max={80} step={1} value={backNameSize} onChange={(e) => setBackNameSize(+e.target.value)} /></label>
                <label>{t("nameY")}<input type="range" min={0.6} max={0.9} step={0.01} value={backNameY} onChange={(e) => setBackNameY(+e.target.value)} /></label>
                <label>{t("number")}<input type="text" value={backNumber} onChange={(e) => setBackNumber(e.target.value)} placeholder="10" /></label>
                <div className="color-row">
            <label>{t("numberColor")} <ColorSwatch value={backNumberColor} onChange={setBackNumberColor} /></label>
            <label>{t("outline")} <ColorSwatch value={backNumberOutline} onChange={setBackNumberOutline} /></label>
          </div>
                <label>{t("numberSize")}<input type="range" min={40} max={260} step={1} value={backNumberSize} onChange={(e) => setBackNumberSize(+e.target.value)} /></label>
                <label>{t("numberY")}<input type="range" min={0.5} max={0.75} step={0.01} value={backNumberY} onChange={(e) => setBackNumberY(+e.target.value)} /></label>
              </section>
            </div>
          )}
        </div>
      </header>

      <main className="stage">
        <div ref={containerRef} className="viewport" />
        <p className="hint">Mannequin gris 3D â€” rotation et zoom a la souris, export PNG de la vue actuelle.</p>
      </main>
    </div>
  );
}