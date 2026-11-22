# Austin Dog Mushing

A small static website for an informal community of dog mushers in Austin, Texas. It has a home page, a short guide, and a forum that runs in the browser.

## Preview

From this folder:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

The folder can also be opened directly, or placed on any static host. There is no build step.

## Pages

- `index.html` is the home page.
- `guide.html` covers dryland mushing, urban outings, e-scooter mushing, heat and paws, commands, and gear.
- `forum.html` is a single list of notes and replies. There are no accounts and no categories.

## Forum data

Posts stay in this browser. `js/forum.js` saves them with `localStorage` under the key `austin-dog-mushing-forum-v1`. Nothing is sent to a server.

`ForumStore` is the seam for a future backend. The page calls only these methods, and each one returns a promise:

- `listThreads()`
- `createThread({ displayName, title, body })`
- `createReply(threadId, { displayName, body })`

A thread is `{ id, title, body, displayName, createdAt, replies }`. A reply is `{ id, body, displayName, createdAt }`. `createdAt` is an ISO-8601 UTC string. `displayName` is a label only. A blank name is stored as `Anonymous`.

Replace the body of `ForumStore` with API calls when a server exists. The page does not need to change.

## Photos

Files in `images/` are crops of the community photos, resized for the page. Camera metadata has been removed.

## Fonts

Source Sans 3 and Source Serif 4 are included under the SIL Open Font License. See `fonts/OFL.txt`.
