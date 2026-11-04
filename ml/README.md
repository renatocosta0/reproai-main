# ReproAI ML service

Predictive model for fertility treatment success.

## Data policy

This service uses **no synthetic or mocked data**. You must supply a real,
anonymized dataset at `ml/data/fertility.csv` with the columns documented in
`train.py` before training.

Suggested sources: HFEA (UK) open fertility data, or a public Kaggle fertility
dataset. Verify the licence and anonymization before use.

## Usage

```bash
pip install -r requirements.txt
python train.py      # trains on ml/data/fertility.csv
python serve.py      # serves predictions on :8000
```
