# whole-enchilada

Open up several nostr clients on your computer and they will start failing.

Why?

Because each client connects to each relay, and the relays will start rejecting the connections because they will only allow one connection per user.

Whole-enchilada is a personal nostr relay that connects to several relays, pulling in all your events. You then with your clients simply connect to your the whole-enchilada.

A work in progress ...

