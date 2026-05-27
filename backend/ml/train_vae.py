"""
Engine 2: Variational Autoencoder for audio feature latent space.
Learns compressed representations where non-linear feature relationships are captured.
Run once: python -m ml.train_vae
"""
import json
import numpy as np
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

FEATURE_KEYS = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness',
                'instrumentalness', 'liveness', 'valence', 'tempo']

class MusicVAE(nn.Module):
    def __init__(self, input_dim=9, hidden_dim=32, latent_dim=8):
        super().__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
        )
        self.fc_mu = nn.Linear(16, latent_dim)
        self.fc_logvar = nn.Linear(16, latent_dim)

        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 16),
            nn.ReLU(),
            nn.BatchNorm1d(16),
            nn.Linear(16, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
            nn.Sigmoid(),
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

def vae_loss(recon, x, mu, logvar):
    recon_loss = nn.functional.mse_loss(recon, x, reduction='sum')
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    return recon_loss + kl_loss

def main():
    with open(os.path.join(DATA_DIR, 'taylor_complete.json'), 'r') as f:
        songs = json.load(f)

    # Extract features
    names = []
    features = []
    for s in songs:
        if all(s.get(k) is not None for k in FEATURE_KEYS):
            row = []
            for k in FEATURE_KEYS:
                val = float(s[k])
                # Normalize loudness (-60,0) -> (0,1) and tempo (50,200) -> (0,1)
                if k == 'loudness':
                    val = (val + 60) / 60
                elif k == 'tempo':
                    val = (val - 50) / 150
                row.append(max(0, min(1, val)))
            features.append(row)
            names.append(s.get('name', ''))

    X = np.array(features, dtype=np.float32)
    print(f"Training VAE on {X.shape[0]} songs with {X.shape[1]} features")

    dataset = TensorDataset(torch.FloatTensor(X))
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    model = MusicVAE(input_dim=9, hidden_dim=32, latent_dim=8)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)

    # Train
    model.train()
    for epoch in range(500):
        total_loss = 0
        for batch in loader:
            x = batch[0]
            optimizer.zero_grad()
            recon, mu, logvar = model(x)
            loss = vae_loss(recon, x, mu, logvar)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if (epoch + 1) % 100 == 0:
            print(f"  Epoch {epoch+1}/500, Loss: {total_loss/len(X):.4f}")

    # Extract latent vectors
    model.eval()
    with torch.no_grad():
        mu, _ = model.encode(torch.FloatTensor(X))
        latents = mu.numpy()

    os.makedirs(OUT_DIR, exist_ok=True)
    np.save(os.path.join(OUT_DIR, 'vae_latents.npy'), latents.astype(np.float32))
    with open(os.path.join(OUT_DIR, 'vae_index.json'), 'w') as f:
        json.dump(names, f)

    # Save model
    torch.save(model.state_dict(), os.path.join(OUT_DIR, 'vae_model.pt'))

    print(f"Saved {latents.shape} latent vectors to ml_data/")

if __name__ == '__main__':
    main()
