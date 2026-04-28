import type { Scenario } from "../module";
import type { OenighetskartanInput } from "./schemas";

/**
 * Curated, editorially reviewed statement sets per topic. The voices
 * are synthetic but composed to span multiple plausible positions on
 * realistic Swedish-policy debates so the LLM has something genuine
 * to cluster and project. Add new cases here; keep statements
 * 1–3 sentences each.
 */
export const FEATURED_SCENARIOS: Scenario<OenighetskartanInput>[] = [
  {
    id: "karnkraft",
    slug: "karnkraft",
    title: "Bör Sverige bygga ny kärnkraft?",
    description:
      "Klimat, ekonomi, lokalt mandat och tidshorisont — flera axlar samtidigt.",
    input: {
      topic: "Bör Sverige bygga ny kärnkraft?",
      statements: [
        {
          id: "k1",
          text: "Sverige behöver mer baskraft för att klara elektrifieringen av industri och transporter. Kärnkraft är den enda realistiska planerbara fossilfria lösningen.",
        },
        {
          id: "k2",
          text: "Ny kärnkraft tar 15–20 år att bygga och kostar minst dubbelt så mycket per kilowattimme som vind- och solkraft. Det är en kostsam återvändsgränd för klimatomställningen.",
        },
        {
          id: "k3",
          text: "Vi kan inte fasa ut fossila bränslen om vi samtidigt fasar ut kärnkraft. Sverige måste pragmatiskt behålla alla fossilfria alternativ.",
        },
        {
          id: "k4",
          text: "Kärnavfallet är ett oöverkomligt arv vi lämnar till hundratals framtida generationer. Det räcker inte att lösa det senare — vi måste säga nej tills vi har en verifierad slutförvaring.",
        },
        {
          id: "k5",
          text: "Marknaden borde få avgöra. Om kärnkraft är konkurrenskraftig kommer den byggas. Statliga garantier är en subvention och bör skippas.",
        },
        {
          id: "k6",
          text: "Utan statliga garantier byggs ingen ny kärnkraft i Sverige. Frågan är bara om staten är beredd att ta de risker som kapitalmarknaden inte vill ta för energisäkerhetens skull.",
        },
        {
          id: "k7",
          text: "Klimatkrisen är akut och kärnkraft är för långsam. Lägg pengarna på sol, vind, lagring och nätutbyggnad istället för något som ger el först om femton år.",
        },
        {
          id: "k8",
          text: "Sveriges existerande kärnkraftverk bör drivas så länge säkerhetsbedömningar tillåter. Att stänga fungerande reaktorer i förtid är slöseri och kontraproduktivt.",
        },
        {
          id: "k9",
          text: "SMR-tekniken (små modulära reaktorer) är obeprövad i kommersiell drift. Vi bör inte satsa miljarder på något som ännu inte fungerar någonstans i världen.",
        },
        {
          id: "k10",
          text: "Kärnkraftens lokala påverkan på arbetsmarknad, kommunal ekonomi och miljö är massiv. Inget beslut bör tas utan starkt lokalt mandat från värdkommunerna.",
        },
        {
          id: "k11",
          text: "Den högljudda kärnkraftsoppositionen har dominerat debatten i decennier trots att en stor majoritet av befolkningen vill ha mer kärnkraft.",
        },
        {
          id: "k12",
          text: "Energifrågan handlar inte bara om CO₂-utsläpp utan också om vem som äger systemet. Kärnkraft skapar centraliserade strukturer som gör konsumenterna beroende av ett fåtal stora aktörer.",
        },
      ],
    },
    tags: ["energi", "klimat"],
  },
  {
    id: "ai-skolan",
    slug: "ai-skolan",
    title: "Bör skolor använda AI för att utvärdera elevers arbeten?",
    description: "Likabehandling, lärarkår, integritet och pedagogik möts.",
    input: {
      topic:
        "Bör grundskolor och gymnasier använda AI-verktyg för att utvärdera elevers skriftliga arbeten?",
      statements: [
        {
          id: "a1",
          text: "AI-bedömning är konsekvent och fri från godtycke. Den ger samma underlag oavsett om läraren har dålig dag eller om eleven känner läraren personligen.",
        },
        {
          id: "a2",
          text: "Bedömning är en del av läraryrkets professionella kärna. Att lägga ut den på en algoritm urholkar yrket och tar bort den pedagogiska feedback-loopen.",
        },
        {
          id: "a3",
          text: "AI-modeller är tränade på engelskspråkigt material och kommer systematiskt missgynna elever som skriver på dialekt eller med svenskt nyans-uttryck.",
        },
        {
          id: "a4",
          text: "Med tydlig mänsklig översyn — där läraren alltid skriver under det slutgiltiga betyget — är AI-stödd bedömning ett effektivt arbetsverktyg som frigör tid till undervisning.",
        },
        {
          id: "a5",
          text: "Låginkomstskolor får sämre lärare och större klasser. AI-bedömning skulle kunna ge dem samma kvalitet som elitklasser. Det handlar om jämlikhet.",
        },
        {
          id: "a6",
          text: "AI-verktyg kommer användas av eleverna när de skriver. Att låta AI bedöma AI-skriven text är en absurd cirkel som inte mäter något.",
        },
        {
          id: "a7",
          text: "Eleverna måste förstå hur AI fungerar — också dess begränsningar. Skolan kan vara den plats där vi utbildar nästa generation i kritiskt AI-användande, inte gömmer tekniken.",
        },
        {
          id: "a8",
          text: "Beslut om elevers framtid får inte tas av en svart låda. Algoritmer som inte kan förklara sina bedömningar har ingen plats i myndighetsutövning mot barn.",
        },
        {
          id: "a9",
          text: "Detta är en fråga om föräldrars samtycke. Ingen elevuppgift bör matas in i ett AI-system utan att vårdnadshavare informerats och godkänt.",
        },
        {
          id: "a10",
          text: "Lärarbristen är akut. Om AI kan ge snabbare och rikare återkoppling på utkast kan lärare lägga sin tid på det de är bäst på: att undervisa och möta eleven.",
        },
        {
          id: "a11",
          text: "AI som bedömer prov producerar mätbar diskriminering eftersom modellerna har bias från träningsdata. Skolan har redan svårt med likabehandling — detta riskerar göra det värre.",
        },
        {
          id: "a12",
          text: "Som med varje teknologi är det HUR den används som avgör. Förbjud inte verktyget — sätt tydliga riktlinjer för proportionalitet, transparens och överklagandemöjligheter.",
        },
      ],
    },
    tags: ["utbildning", "AI"],
  },
  {
    id: "mobilforbud",
    slug: "mobilforbud",
    title: "Bör mobiltelefoner förbjudas i grundskolan?",
    description:
      "Koncentration, integritet, föräldrarätt och praktiska frågor.",
    input: {
      topic: "Bör mobiltelefoner förbjudas i grundskolan?",
      statements: [
        {
          id: "m1",
          text: "Forskning visar att även en avstängd mobil i fickan försämrar koncentrationen. Förbjud i klassrummet — det är en lätt vinst för lärandet.",
        },
        {
          id: "m2",
          text: "Mobilen är ett verktyg, inte ett problem i sig. Lär eleverna använda den klokt istället för att förbjuda den och låta dem förvirras när de möter den i resten av livet.",
        },
        {
          id: "m3",
          text: "Föräldrar har rätt att kunna nå sina barn under skoldagen. Total mobilfrihet kränker den principen.",
        },
        {
          id: "m4",
          text: "Mobbning på sociala medier flyttar in i skolan via mobilerna. Förbud är ett konkret sätt att skapa frizon från det.",
        },
        {
          id: "m5",
          text: "Beslutet hör hemma på skolnivå, inte nationellt. Skolledningarna känner sina elever och kan bedöma vad som passar lokalt.",
        },
        {
          id: "m6",
          text: "Mobilerna är inte bara distraktion — de är pedagogiska resurser. Översättningsverktyg, kalkyl, snabb faktakontroll. Förbud är teknikfientligt och otidsenligt.",
        },
        {
          id: "m7",
          text: "Barn med särskilda behov använder ibland mobiler för stöd — påminnelser, kommunikationsappar, sensoriska hjälpmedel. Ett brett förbud måste ha undantag.",
        },
        {
          id: "m8",
          text: "Det här är en typisk fråga där vuxenvärlden hyperfokuserar på en synlig sak istället för att ta tag i den verkliga frågan: vad gör vi åt skolans kvalitet och resurser?",
        },
        {
          id: "m9",
          text: "Internationella jämförelser visar att länder som infört förbud sett mätbar förbättring i koncentration och välmående. Det är dags Sverige följer efter.",
        },
        {
          id: "m10",
          text: "Förbud blir en polisuppgift för lärare. De ska undervisa, inte konfiskera. Inför det inte utan att också ge skolorna resurser att hantera följderna.",
        },
      ],
    },
    tags: ["utbildning"],
  },
  {
    id: "kamerovervakning",
    slug: "kamerovervakning",
    title: "Bör kommuner kameraövervaka offentliga platser med AI?",
    description:
      "Trygghet, integritet, effektivitet och vem som har makten över systemen.",
    input: {
      topic:
        "Bör kommuner använda AI-baserad kameraövervakning på offentliga platser?",
      statements: [
        {
          id: "c1",
          text: "Brottsligheten på torg och gågator har ökat. Människor har rätt att kunna röra sig tryggt. AI-kameror som identifierar händelser i realtid är ett effektivt verktyg.",
        },
        {
          id: "c2",
          text: "Massövervakning normaliseras stegvis. Vi måste säga nej innan vi har en infrastruktur som vilken framtida regering som helst kan missbruka.",
        },
        {
          id: "c3",
          text: "Ansiktsigenkänning innebär att man som medborgare kontinuerligt identifieras utan brottsmisstanke. Det strider mot grundläggande integritetsprinciper.",
        },
        {
          id: "c4",
          text: "AI-kameror som bara reagerar på definierade händelser — slagsmål, fall, larm — är kvalitativt annorlunda än ansiktsigenkänning. Vi måste skilja på de två.",
        },
        {
          id: "c5",
          text: "Det är polisens uppgift att skapa trygghet. Att kommunalisera övervakningsfunktioner urholkar rättsstatens ordning och skapar en gråzon utan tydligt ansvar.",
        },
        {
          id: "c6",
          text: "Kamerorna förflyttar bara brottsligheten till oövervakade områden. Inga studier visar nettominskning — det är dyr placeboeffekt.",
        },
        {
          id: "c7",
          text: "Lokalbefolkningen i utsatta områden vill ha kameror. Den som motsätter sig på principskäl ska respektera de som faktiskt bor där och dagligen oroar sig för sin trygghet.",
        },
        {
          id: "c8",
          text: "Vem äger datan? Vilka företag säljer systemen? Vilken transparens finns i algoritmerna? Innan dessa frågor är besvarade får inga AI-kameror sättas upp.",
        },
        {
          id: "c9",
          text: "AI-system har dokumenterad bias — fel i ansiktsigenkänning är kraftigt vanligare för mörkhyade. Att införa systemen utan att ha löst det är en form av strukturell rasism.",
        },
        {
          id: "c10",
          text: "Med proportionalitetsprincip, oberoende tillsyn, tidsbegränsad lagring och möjlighet att överklaga är AI-övervakning en sund komponent i ett modernt trygghetsarbete.",
        },
        {
          id: "c11",
          text: "Diskussionen om AI-kameror är symbolpolitik. Verklig trygghet kommer från fler poliser i tjänst, snabbare utredningar och socialt arbete — inte från fler kameror.",
        },
      ],
    },
    tags: ["trygghet", "integritet"],
  },
];
