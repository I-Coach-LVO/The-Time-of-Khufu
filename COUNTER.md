# Homepaginateller

De teller verschijnt onder het eerste introscherm. Hij verdwijnt bij Volgende, Intro overslaan of het openen van een kamer. Een hervat spel telt niet mee. De game blijft bruikbaar bij een storing; er verschijnen dan streepjes in plaats van verzonnen nullen.

Vandaag, deze week (maandag-zondag), deze maand en dit jaar gebruiken Europe/Amsterdam. Het zijn bezoeken, geen unieke personen. Binnen dezelfde tab/browser-sessie wordt verversen niet opnieuw geteld (sessionStorage plus een ondertekende sessiecookie). De teller begint bij ingebruikname; eerdere bezoeken zijn niet gereconstrueerd.

## Nog nodig voor ingebruikname
0. Maak in GitHub een aparte branch `counter-data`. Zet daarin `visits.json` met `{"version":1,"days":{}}` en `vercel.json` met `{"git":{"deploymentEnabled":false}}`. Deze branch is nog niet aangemaakt: schrijven naar GitHub werd door de goedkeuringsinstelling geblokkeerd.
1. Maak een GitHub fine-grained token met toegang uitsluitend tot I-Coach-LVO/The-Time-of-Khufu, repository permission Contents: Read and write.
2. Bewaar die in Vercel > the-time-of-khufu > Settings > Environment Variables, naam KHUFU_GITHUB_TOKEN, alleen Production, als secret. Plaats de sleutel nooit in deze repository of in chat.
3. Voeg deze wijziging samen en publiceer de nieuwe code in het bestaande Vercel-project (het project is eerder via CLI gepubliceerd). De api-map moet mee; alleen statische bestanden uploaden is onvoldoende.
4. Controleer de homepagina, Volgende, verversen en /api/visits.

## Opslag
De aparte branch counter-data bevat visits.json met alleen dagtotalen. Geen IP-adressen, namen of bezoeker-ID's. De branch heeft deploymentEnabled:false zodat tellen geen deployments start. Alle vier totalen worden uit dezelfde daggegevens berekend. Gelijktijdige bezoeken worden via GitHub-SHA-controle en retries verwerkt. De geheime schrijfsleutel blijft op de server.

GitHub is geschikt voor bescheiden bezoekaantallen, maar heeft API- en schrijflimieten. Een bot kan een nieuwe sessie nabootsen; dit is geen fraudebestendige analysetool. Bij veel gelijktijdige bezoeken of GitHub-storingen kan een registratie mislukken. Een verloren antwoord na een geslaagde opslag kan bij een volgend bezoek dubbel tellen. Bij grote aantallen is een database met atomische increment beter.

## Testen
node --test --test-isolation=none tests/counter.test.js
