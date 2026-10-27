# Oracle Cloud ARM deployment

This project can run as a static Nginx site on an Oracle Cloud Ampere A1 ARM64 instance. The
Docker base images used by the repository publish ARM64 variants, so building directly on the
instance automatically produces the correct image.

The current deployment target is:

| setting | value |
| --- | --- |
| public IP | `134.185.92.198` |
| SSH user | `ubuntu` |
| private-key path | `C:\Users\home\Downloads\0744.key` |
| repository | `https://github.com/royalpeak58649/my-game.git` |

Never commit or upload `0744.key`.

## 1. Create the instance

Recommended choices in Oracle Cloud Infrastructure:

- Image: Ubuntu 24.04 (ARM64)
- Shape: `VM.Standard.A1.Flex` within the account's Always Free allowance
- Allocation: 1 OCPU and 6 GB RAM is ample; keep the values within the allowance shown by OCI
- Boot volume: 50 GB is sufficient for the application and Docker images
- Public IPv4 address: enabled
- SSH key: add your public key when creating the instance

In the instance's Network Security Group or subnet Security List, allow these ingress rules:

| source | protocol | port | purpose |
| --- | --- | --- | --- |
| your public IP | TCP | 22 | SSH administration |
| `0.0.0.0/0` | TCP | 80 | game website |

Restrict SSH to your own public IP rather than opening port 22 to the world.

## 2. Install Docker

Connect from Windows PowerShell:

```powershell
ssh -i "C:\Users\home\Downloads\0744.key" ubuntu@134.185.92.198
```

Then install Docker and the Compose plugin on the server:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
```

If Ubuntu's host firewall is enabled, allow SSH and HTTP before enabling it:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
```

## 3. Deploy

Clone the repository and start the container:

```bash
git clone https://github.com/royalpeak58649/my-game.git my-game
cd my-game
sudo docker compose up -d --build
sudo docker compose ps
curl -I http://127.0.0.1/
```

Open `http://134.185.92.198/` in a browser. The container restarts automatically after an
instance reboot or process failure.

For a first deployment, the installation and deployment can also be launched from PowerShell
with one SSH command:

```powershell
ssh -i "C:\Users\home\Downloads\0744.key" ubuntu@134.185.92.198 "sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git && sudo systemctl enable --now docker && if [ ! -d my-game/.git ]; then git clone https://github.com/royalpeak58649/my-game.git my-game; fi && cd my-game && git pull --ff-only && sudo docker compose up -d --build && sudo docker compose ps"
```

If OpenSSH reports that the private-key permissions are too broad, restrict them in an
administrator PowerShell window and retry:

```powershell
icacls "C:\Users\home\Downloads\0744.key" /inheritance:r
icacls "C:\Users\home\Downloads\0744.key" /grant:r "$($env:USERNAME):(R)"
```

To use a host port other than 80, set `GAME_PORT` when starting Compose:

```bash
sudo env GAME_PORT=8080 docker compose up -d --build
```

## 4. Update or roll back

Rebuild after pulling a new revision:

```bash
git pull --ff-only
sudo docker compose up -d --build
```

To inspect the running service:

```bash
sudo docker compose ps
sudo docker compose logs --tail=100 game
```

To roll back, check out the desired commit and rebuild:

```bash
git checkout COMMIT_ID
sudo docker compose up -d --build
```

## ARM notes

- Building on the Ampere instance needs no `--platform` option.
- The Vite build happens once inside the Node build stage; Nginx serves only the generated files.
- Save files remain in each player's browser and are not stored on the server.
- The production container exposes no Node or Vite development server.
