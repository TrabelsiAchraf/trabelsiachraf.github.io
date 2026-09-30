# Alignement des sites d'applis sur trabelsiachraf.com — conception

Date : 30 septembre 2026. Dépôts concernés : `my-website`, `munajat-site`, `mirrorkit-site`,
`clipdori-site`, nouveau `saltscan-site`, et les dépôts d'applis `Munajat`, `MirrorApp`,
`clipdori`, `SaltScan`. Statut : validée section par section en conversation.

## 1. Objectif

Chaque appli publiée (Munajat, MirrorKit, Clipdori, Salt Scan) a un site avec accueil, Support,
Privacy et Accessibility, servi sur `trabelsiachraf.com/…`, et tous les liens (pages, README,
App Store Connect quand c'est modifiable) pointent vers `trabelsiachraf.com`. Les anciennes
adresses `trabelsiachraf.github.io/…` continuent de fonctionner.

### État de départ

| Appli | Dépôt du site | Accueil | Support | Privacy | Accessibility | URLs chez Apple |
|---|---|---|---|---|---|---|
| Munajat (référence) | `munajat-site` | oui | oui | oui | oui | github.io |
| MirrorKit | `mirrorkit-site` | oui | oui | oui | non | github.io |
| Clipdori | `clipdori-site` | oui (sobre, FR+EN empilés) | oui | oui | oui | github.io |
| Salt Scan | aucun | non | non | non | non | `https://trabelsiachraf.com` (page perso) |

`my-website` est un site GitHub Pages de projet avec le domaine `trabelsiachraf.com` ; les sites
d'applis sont des sites de projet sans domaine. Contact commun : `trabelsiachraf.devapps@gmail.com`.

### Critères de réussite

1. `https://trabelsiachraf.com/<site>/` et ses pages Support, Privacy, Accessibility répondent
   200 pour les quatre sites.
2. Chaque ancienne adresse `https://trabelsiachraf.github.io/<site>/<page>` redirige vers
   `https://trabelsiachraf.com/<site>/<page>`, en particulier celles déclarées chez Apple.
3. `https://trabelsiachraf.com/` (site perso) et son workflow de statistiques fonctionnent comme
   avant.
4. Chaque page de chaque site a un pied de page vers Accueil, Support, Privacy, Accessibility et
   l'App Store, en URLs `trabelsiachraf.com`.
5. Chaque README (sites et applis) a une section « Links » complète en URLs `trabelsiachraf.com`.
6. Aucun contenu n'affirme une fonction ou une garantie non vérifiée dans le code de l'appli.
7. Rien n'est soumis à Apple ; aucun champ App Store Connect n'est vidé ; Clipdori, en cours de
   review, n'est pas touché côté App Store Connect.

### Hors périmètre

CertWatch, erizou et les autres dépôts ; refonte du design de Munajat et MirrorKit ; nouvelles
captures d'applis ; déclarations d'accessibilité App Store Connect (« Accessibility Nutrition
Labels ») ; soumission de versions.

## 2. Hébergement et URLs

- Renommer le dépôt `my-website` en `trabelsiachraf.github.io` (site « utilisateur »). Le fichier
  `CNAME` (`trabelsiachraf.com`) et la publication depuis `master` à la racine sont conservés.
  GitHub sert alors les sites de projet du compte sous `trabelsiachraf.com/<dépôt>/` et redirige
  `trabelsiachraf.github.io/<dépôt>/…` vers `trabelsiachraf.com/<dépôt>/…`.
- Mettre à jour la remote du clone local `/Users/a.trabelsi/Workspace/Perso/my-website`.
- Nouveau dépôt public `saltscan-site`, GitHub Pages depuis `main` à la racine.
- Adresses finales : `trabelsiachraf.com/munajat-site/`, `/mirrorkit-site/`, `/clipdori-site/`,
  `/saltscan-site/`.

### Langues

Un dossier par langue quand un site est multilingue, pour pouvoir viser une langue depuis les
champs App Store Connect (qui sont par langue) :

- Salt Scan : anglais à la racine, `fr/`, `ar/` (`<html lang="ar" dir="rtl">`).
- Clipdori, nouvel accueil : anglais à la racine, `fr/`. Les pages existantes `support.html`,
  `privacy.html`, `accessibility.html` restent à la même adresse et gardent leur contenu bilingue.
- Munajat, MirrorKit : anglais seul, inchangé.

Chaque page multilingue propose les autres langues (liens en tête) et déclare
`<link rel="alternate" hreflang="…">` vers ses équivalents, plus `x-default` vers l'anglais.

## 3. Contenu

Règle commune : HTML statique sans framework ni script de suivi, un seul fichier CSS ou un bloc
`<style>` comme le site existant, pas de ressource externe autre que des polices si le site en
utilise déjà. Toute affirmation sur l'appli est vérifiée dans son code ou ses textes publiés ;
ce qui ne peut pas l'être est omis.

### Pied de page commun (tous les sites)

Liens : Home · Support · Privacy · Accessibility · App Store (ou Mac App Store), en URLs absolues
`https://trabelsiachraf.com/<site>/…`, plus « Made by Achraf Trabelsi » vers
`https://trabelsiachraf.com/`. Dans les sites multilingues, le pied de page est traduit et pointe
vers les pages de la même langue.

### Salt Scan (nouveau, modèle Munajat, en / fr / ar)

- **Accueil** : hero avec la capture du store de la langue (`marketing/screenshots/<locale>/6.9/`
  du dépôt SaltScan : en-US pour `en`, fr-FR pour `fr`, ar-SA pour `ar`), bouton App Store
  (`https://apps.apple.com/app/id6740041173`), fonctions (scan du code-barres, niveau de sel
  faible / moyen / élevé aux seuils UK, sodium en mg ou sel en g selon le pays, journal par jour
  modifiable, portions ou grammes, comparaison, export Santé facultatif), « Gratuit, sans pub,
  sans suivi ».
- **Support** : prise en main, FAQ reprise des chaînes `FAQ.description.item01…12` de l'appli
  (dont journal et Santé), contact par e-mail.
- **Privacy** : reprise de `termsAndPrivacy.privacy.description` de l'appli, vérifiée dans le
  code : pas de compte, pas d'analytics ni de publicité ; historique et journal stockés sur
  l'appareil (SwiftData) ; le code-barres scanné ou le texte recherché est envoyé à Open Food
  Facts, et le code-barres à Firebase Firestore en secours ; export Santé en écriture seule,
  facultatif, rien ne quitte l'appareil ; demande de note via le système ; e-mail de contact
  via l'app Mail.
- **Accessibility** : uniquement le vérifié dans le code (tailles de texte système, libellés
  VoiceOver sur les écrans du journal et l'anneau, mode sombre, arabe de droite à gauche),
  plus le contact pour signaler un problème.

### Clipdori (nouvel accueil moderne, en / fr)

Même structure que les accueils Munajat et MirrorKit (hero, fonctions, captures, tarif), dans
l'identité approuvée ivoire, turquoise et or. Sources : `SmartClipboard/marketing/launch-copy.md`,
`marketing/app-store/` (textes, `pricing.md`, captures `exports/<lang>/iphone|ipad|mac`),
`marketing/branding/icon-master-1024.png`. Le lien App Store est celui de l'appli
(id 6816525366) ; tant que l'appli n'est pas en vente, le bouton indique « Bientôt sur
l'App Store » / « Coming soon to the App Store » sans lien mort. Les pages Support, Privacy,
Accessibility existantes ne changent que par le pied de page commun.

### MirrorKit

Nouvelle `accessibility.html` dans le gabarit du site, remplie depuis le code de `MirrorApp`
(raccourcis clavier, VoiceOver, réglages macOS respectés). Pied de page commun sur toutes les
pages.

### Munajat

Pied de page commun, README, liens. Pas d'autre changement.

### README

- **Sites** : section « Links » avec site officiel, Support, Privacy, Accessibility (par langue
  pour Salt Scan et Clipdori), App Store, dépôt de l'appli ; aperçu local ; mise à jour des
  captures.
- **Applis** (`Munajat`, `MirrorApp`, `clipdori`, `SaltScan`) : section « Links » identique.
- **Site perso** : chaque carte d'appli de `index.html` gagne un lien « Website » vers son site,
  à côté du lien App Store.

## 4. App Store Connect

- **Salt Scan 0.5.0** (modifiable) : Support et Marketing par langue de version, Privacy par
  langue d'infos d'appli : en-US et en-GB vers les pages anglaises, fr-FR et fr-CA vers `fr/`,
  ar-SA vers `ar/`.
- **Munajat, MirrorKit** : versions en vente, champs de version verrouillés ; l'URL Privacy
  (infos d'appli) est modifiée seulement si une fiche d'infos modifiable existe. Les champs
  restants sont listés pour la prochaine version de chaque appli ; la redirection couvre
  l'intervalle.
- **Clipdori** : en review, aucun changement.

## 5. Ordre et vérification

1. Contenu sur les adresses actuelles : `saltscan-site`, accessibilité MirrorKit, accueil
   Clipdori, pieds de page ; tout est poussé et publié sur github.io.
2. Renommage de `my-website`, remote locale, puis vérification immédiate des critères 1 à 3.
3. README des sites, des applis et cartes du site perso.
4. Champs App Store Connect modifiables.
5. Script de vérification : chaque lien de chaque page et README ; chaque URL `trabelsiachraf.com`
   doit répondre 200, chaque ancienne URL github.io rediriger vers son équivalent `.com`.
   Rendu navigateur des pages arabes de Salt Scan (captures) pour vérifier le sens de lecture.

### Sécurité

Le renommage est la seule étape risquée et se défait en renommant à nouveau (GitHub garde les
redirections). Si le domaine `.com` montre un problème après le renommage, retour immédiat au
nom `my-website`. Aucune suppression de dépôt, de page ou de champ.
