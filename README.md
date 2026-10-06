# lowtaper67.fr

Site du créateur, déployé sur [lowtaper67.fr](https://lowtaper67.fr). L'accueil est un panorama 360. Le même projet sert la boutique, le compte, et le jeu Just Aura.

## Just Aura

Salon de pose. L'écran hôte ouvre la partie, chaque téléphone filme le joueur et compare sa pose au move.

- Jeu : `/aura`
- Hôte : `/aura/hote`
- Joueur : `/aura/jouer/[code]`
- Entraînement, sans salon : `/aura/entrainement`

Deux modes : quinze manches, ou Battle Royale sur un clip long. Le classement élimine, il n'y a pas de démo. Aucune vidéo de joueur n'est envoyée. Supabase reçoit le salon, les pseudos et les scores.

`npm run crowd -- CODE` ajoute des joueurs fictifs dans un salon déjà ouvert, pour tester la charge.

## Lancer

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Les variables sont listées dans `.env.local.example`. `.env.local` reste sur la machine.

## Stack

Next.js, Supabase, Three.js pour le panorama, MediaPipe Pose pour le juge.
