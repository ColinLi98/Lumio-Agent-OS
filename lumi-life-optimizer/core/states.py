"""
State Space Definitions for the Life Optimizer MDP

A State represents a snapshot of a person's life at a given moment:
- age: Current age (20-80)
- assets: Discretized wealth level (0-100)
- skill: Accumulated skills/expertise (0-10)
- energy: Physical/mental energy (0-10)
"""

from dataclasses import dataclass
from typing import Iterator, Tuple


@dataclass(frozen=True)
class State:
    """
    Immutable state representation for the Life MDP.
    
    Frozen=True makes it hashable for use as dictionary keys.
    """
    age: int      # 20-80
    assets: int   # 0-100 (discretized wealth)
    skill: int    # 0-10
    energy: int   # 0-10
    
    def __post_init__(self):
        """Validate state bounds."""
        assert 20 <= self.age <= 80, f"Age must be 20-80, got {self.age}"
        assert 0 <= self.assets <= 100, f"Assets must be 0-100, got {self.assets}"
        assert 0 <= self.skill <= 10, f"Skill must be 0-10, got {self.skill}"
        assert 0 <= self.energy <= 10, f"Energy must be 0-10, got {self.energy}"
    
    def is_terminal(self) -> bool:
        """Check if this is a terminal state (age 80)."""
        return self.age >= 80
    
    def __repr__(self) -> str:
        return f"State(age={self.age}, assets={self.assets}, skill={self.skill}, energy={self.energy})"


# Discretization constants
AGE_RANGE = (20, 80)
ASSETS_RANGE = (0, 100)
SKILL_RANGE = (0, 10)
ENERGY_RANGE = (0, 10)

# For computational efficiency, we use coarser discretization
ASSETS_STEP = 10   # 11 levels: 0, 10, 20, ..., 100
SKILL_STEP = 2     # 6 levels: 0, 2, 4, 6, 8, 10
ENERGY_STEP = 2    # 6 levels: 0, 2, 4, 6, 8, 10


def discretize(value: int, step: int, min_val: int, max_val: int) -> int:
    """Discretize a value to the nearest step."""
    discretized = round(value / step) * step
    return max(min_val, min(max_val, discretized))


def get_all_states() -> Iterator[State]:
    """
    Generator that yields all valid states in the MDP.
    
    Uses coarser discretization for tractable computation:
    - Age: every year (61 levels)
    - Assets: every 10 units (11 levels)
    - Skill: every 2 units (6 levels)
    - Energy: every 2 units (6 levels)
    
    Total: 61 * 11 * 6 * 6 = 24,156 states
    """
    for age in range(AGE_RANGE[0], AGE_RANGE[1] + 1):
        for assets in range(ASSETS_RANGE[0], ASSETS_RANGE[1] + 1, ASSETS_STEP):
            for skill in range(SKILL_RANGE[0], SKILL_RANGE[1] + 1, SKILL_STEP):
                for energy in range(ENERGY_RANGE[0], ENERGY_RANGE[1] + 1, ENERGY_STEP):
                    yield State(age=age, assets=assets, skill=skill, energy=energy)


def count_states() -> int:
    """Count total number of states (for debugging)."""
    return sum(1 for _ in get_all_states())


def create_state(age: int, assets: int, skill: int, energy: int) -> State:
    """
    Create a state with automatic discretization and clamping.
    """
    return State(
        age=max(AGE_RANGE[0], min(AGE_RANGE[1], age)),
        assets=discretize(assets, ASSETS_STEP, *ASSETS_RANGE),
        skill=discretize(skill, SKILL_STEP, *SKILL_RANGE),
        energy=discretize(energy, ENERGY_STEP, *ENERGY_RANGE)
    )
