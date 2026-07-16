"""
Engine 2: Variational Autoencoder over lyrics embeddings.
Compresses the 384-dim Sentence-BERT lyrics embeddings (Engine 1 output)
into a 16-dim latent space (24:1 compression) with a beta-weighted VAE
(Kingma & Welling, 2013/ICLR 2014). Encoder 384->128->64->(mu,logvar 16),
beta=0.1 for reconstruction-favoring regularization.

Requires ml_data/lyrics_embeddings.npy — run ml.compute_lyrics_embeddings first.
Run once: cd backend && python -m ml.train_vae
"""
import json
import numpy as np
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

BETA = 0.1  # KL weight: low, favors reconstruction (see HowItWorks "The Math")
WARMUP_EPOCHS = 50  # anneal KL 0 -> BETA to prevent posterior collapse
EPOCHS = 300
LATENT_DIM = 16


class LyricsVAE(nn.Module):
    def __init__(self, input_dim=384, latent_dim=LATENT_DIM):
        super().__init__()
        # Encoder: 384 -> 128 -> 64 -> (mu, logvar)
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
        )
        self.fc_mu = nn.Linear(64, latent_dim)
        self.fc_logvar = nn.Linear(64, latent_dim)

        # Decoder: latent -> 64 -> 128 -> 384 (linear output; embeddings are unbounded)
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 128),
            nn.ReLU(),
            nn.Linear(128, input_dim),
        )

    def encode(self, x):
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def decode(self, z):
        return self.decoder(z)

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        recon = self.decode(z)
        return recon, mu, logvar


def vae_loss(recon, x, mu, logvar, beta=BETA):
    recon_loss = nn.functional.mse_loss(recon, x, reduction='sum')
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    return recon_loss + beta * kl_loss


def main():
    torch.manual_seed(42)

    emb_path = os.path.join(OUT_DIR, 'lyrics_embeddings.npy')
    idx_path = os.path.join(OUT_DIR, 'lyrics_index.json')
    if not os.path.exists(emb_path):
        raise SystemExit("lyrics_embeddings.npy not found — run: python -m ml.compute_lyrics_embeddings")

    X = np.load(emb_path).astype(np.float32)
    with open(idx_path) as f:
        index = json.load(f)

    # z-score each embedding dimension: raw MiniLM components are ~1/sqrt(384),
    # so an unscaled reconstruction term is dwarfed by the KL term and the
    # posterior collapses (all latents -> prior mean, no structure).
    X = (X - X.mean(axis=0)) / np.clip(X.std(axis=0), 1e-8, None)

    print(f"Training VAE on {X.shape[0]} songs x {X.shape[1]}-dim lyrics embeddings")

    dataset = TensorDataset(torch.FloatTensor(X))
    loader = DataLoader(dataset, batch_size=64, shuffle=True)

    model = LyricsVAE(input_dim=X.shape[1], latent_dim=LATENT_DIM)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)

    model.train()
    for epoch in range(EPOCHS):
        beta = BETA * min(1.0, (epoch + 1) / WARMUP_EPOCHS)  # KL warm-up
        total_loss = 0
        for (x,) in loader:
            optimizer.zero_grad()
            recon, mu, logvar = model(x)
            loss = vae_loss(recon, x, mu, logvar, beta=beta)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if (epoch + 1) % 50 == 0:
            print(f"  Epoch {epoch+1}/{EPOCHS}, Loss: {total_loss/len(X):.4f}")

    # Latent vectors = posterior means
    model.eval()
    with torch.no_grad():
        mu, _ = model.encode(torch.FloatTensor(X))
        latents = mu.numpy()

    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'vae_latents.npy'), latents.astype(np.float32))
    with open(os.path.join(OUT_DIR, 'vae_index.json'), 'w') as f:
        json.dump(index, f)
    torch.save(model.state_dict(), os.path.join(OUT_DIR, 'vae_model.pt'))

    print(f"Saved {latents.shape} latent vectors to ml_data/ ({X.shape[1]}:{LATENT_DIM} = 24:1 compression)")


if __name__ == '__main__':
    main()
