Do-Wallet deployment notes

This release keeps client wallet storage intact.

Browser localStorage is stored on each client's device under the same do-wallet.com origin.
Replacing files on /opt/dochain-wallet/current does not delete that localStorage.

Single server route:
  local current/ -> /opt/dochain-wallet/current
  nginx root -> /opt/dochain-wallet/current/frontend

No backup or archive files are created by the deploy helper.

Safe server flow:
1. Upload and unpack the Do-Wallet release bundle on the server.
2. Run current/tools/deploy-do-wallet.sh as the deploy user/root.
3. Verify https://do-wallet.com/version.json says Do-Wallet.
4. Verify a wallet still connects without re-import.
5. Only after that, run the deploy script again with CONFIRM_DELETE_OLD_RELEASES=yes if old server release folders should be removed.

It preserves station-assets.env, station-assets/.env, and station-assets/node_modules on the server.
