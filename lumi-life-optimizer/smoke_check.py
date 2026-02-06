#!/usr/bin/env python3
"""
Minimal smoke test for lumi-life-optimizer.
Runs imports + one solver pass to catch runtime breakage quickly.
"""

from core.states import create_state
from core.solver import ValueIterationAgent, simulate_life


def main() -> None:
    start = create_state(age=20, assets=20, skill=2, energy=8)
    agent = ValueIterationAgent(gamma=0.85, threshold=0.1, max_iterations=120)
    values, policy = agent.solve()
    if not values:
        raise RuntimeError("ValueIterationAgent returned empty values")
    if not policy:
        raise RuntimeError("ValueIterationAgent returned empty policy")

    trajectory = simulate_life(policy, start)
    if not trajectory:
        raise RuntimeError("simulate_life returned empty trajectory")

    print("lumi-life-optimizer smoke ok")


if __name__ == "__main__":
    main()
