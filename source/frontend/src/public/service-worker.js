self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(clearDoWalletCaches());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    clearDoWalletCaches().then(function () {
      return self.clients && self.clients.claim ? self.clients.claim() : undefined;
    }).then(function () {
      return self.registration && self.registration.unregister
        ? self.registration.unregister()
        : undefined;
    }).then(function () {
      return self.clients && self.clients.matchAll
        ? self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
            clients.forEach(function (client) {
              try {
                client.navigate(client.url);
              } catch (error) {}
            });
          })
        : undefined;
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data === "DO_WALLET_CLEAR_SERVICE_WORKER") {
    event.waitUntil(
      clearDoWalletCaches().then(function () {
        return self.registration && self.registration.unregister
          ? self.registration.unregister()
          : undefined;
      })
    );
  }
});

function clearDoWalletCaches() {
  return self.caches && self.caches.keys
    ? self.caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return self.caches.delete(key);
        }));
      })
    : Promise.resolve();
}
