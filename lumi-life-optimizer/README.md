# 🎯 Lumi Life Optimizer

A Python-based "Life Optimization Engine" using MDP (Markov Decision Process) and Bellman Value Iteration.

## The Core Insight

**Gamma (γ)** is your "Vision Factor" — it mathematically represents how much you value the future vs. the present.

```
V(s) = max_a [ R(s,a) + γ * Σ P(s'|s,a) * V(s') ]
```

- **γ = 0.1** → Short-sighted: Chooses RELAX (feels good now)
- **γ = 0.95** → Visionary: Chooses STUDY → STARTUP (J-Curve growth)

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Streamlit dashboard
streamlit run app/main.py
```

## Project Structure

```
lumi-life-optimizer/
├── core/
│   ├── states.py    # State space (age, assets, skill, energy)
│   ├── actions.py   # Actions & transitions (WORK, STUDY, STARTUP, RELAX)
│   └── solver.py    # Bellman Value Iteration
├── app/
│   └── main.py      # Streamlit dashboard
└── requirements.txt
```

## Key Features

1. **MDP Life Model**: 4-dimensional state space (~24K states)
2. **Bellman Solver**: Explicit value iteration with configurable γ
3. **Interactive Dashboard**: Visualize how vision changes destiny
4. **J-Curve Demo**: See the "delayed gratification" effect in action

## The Actions

| Action | Immediate Feel | Long-term Effect |
|--------|----------------|------------------|
| WORK_CORP | +2 (stable) | Steady but slow growth |
| STUDY | -3 (painful) | High skill accumulation |
| STARTUP | -5 (very hard) | 10% chance of massive wealth |
| RELAX | +8 (great!) | Energy recovery, asset decay |

## License

Built with ❤️ by Lumi.AI
