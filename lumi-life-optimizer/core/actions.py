"""
Action Space & Transitions for the Life Optimizer MDP

Actions represent major life decisions:
- WORK_CORP: Corporate job - steady income, slow skill growth
- STUDY: Education/training - costs money, builds skills
- STARTUP: Entrepreneurship - high risk, high reward
- RELAX: Rest/leisure - costs living expenses, recovers energy
"""

from enum import Enum
from typing import List, Tuple
import random

from .states import State, create_state, ASSETS_STEP, SKILL_STEP, ENERGY_STEP


class Action(Enum):
    """Life action choices."""
    WORK_CORP = "work_corp"    # Corporate job
    STUDY = "study"           # Education/training
    STARTUP = "startup"       # Start a business
    RELAX = "relax"           # Rest and recover


# Default startup success probability (can be adjusted via risk_tolerance)
DEFAULT_STARTUP_SUCCESS_PROB = 0.10


def get_transition(
    state: State, 
    action: Action,
    startup_success_prob: float = DEFAULT_STARTUP_SUCCESS_PROB
) -> List[Tuple[float, State]]:
    """
    Get probabilistic transitions for a state-action pair.
    
    Returns:
        List of (probability, next_state) tuples
    """
    if state.is_terminal():
        return [(1.0, state)]  # Stay in terminal state
    
    next_age = state.age + 1
    
    if action == Action.WORK_CORP:
        # Corporate job: steady but boring
        # - Assets: +10 (steady salary)
        # - Skill: +1 (slow growth)
        # - Energy: -2 (office drain)
        new_assets = state.assets + ASSETS_STEP
        new_skill = state.skill + 1
        new_energy = state.energy - ENERGY_STEP
        
        next_state = create_state(next_age, new_assets, new_skill, new_energy)
        return [(1.0, next_state)]
    
    elif action == Action.STUDY:
        # Study/Education: investment in future
        # - Assets: -10 (tuition cost)
        # - Skill: +3 (high growth)
        # - Energy: -1 (mental effort)
        new_assets = state.assets - ASSETS_STEP
        new_skill = state.skill + 3
        new_energy = state.energy - 1
        
        next_state = create_state(next_age, new_assets, new_skill, new_energy)
        return [(1.0, next_state)]
    
    elif action == Action.STARTUP:
        # Startup: high risk, high reward
        # Success (10%): Assets +50, Skill +2
        # Failure (90%): Assets -20, Skill +1
        # Both: Energy -3 (exhausting)
        
        success_prob = startup_success_prob
        fail_prob = 1.0 - success_prob
        
        # Success outcome
        success_assets = state.assets + 50
        success_skill = state.skill + 2
        success_energy = state.energy - 3
        success_state = create_state(next_age, success_assets, success_skill, success_energy)
        
        # Failure outcome
        fail_assets = state.assets - 20
        fail_skill = state.skill + 1
        fail_energy = state.energy - 3
        fail_state = create_state(next_age, fail_assets, fail_skill, fail_energy)
        
        return [
            (success_prob, success_state),
            (fail_prob, fail_state)
        ]
    
    elif action == Action.RELAX:
        # Relax: enjoy life now
        # - Assets: -5 (cost of living)
        # - Skill: 0 (no growth)
        # - Energy: +3 (recovery)
        new_assets = state.assets - 5
        new_skill = state.skill
        new_energy = state.energy + 3
        
        next_state = create_state(next_age, new_assets, new_skill, new_energy)
        return [(1.0, next_state)]
    
    else:
        raise ValueError(f"Unknown action: {action}")


def get_reward(state: State, action: Action) -> float:
    """
    Get immediate reward for taking an action in a state.
    
    The reward function is designed to:
    - RELAX gives high immediate pleasure
    - STUDY/STARTUP give negative immediate reward (suffering/sacrifice)
    - WORK_CORP gives moderate reward
    
    This creates the "delayed gratification" tension that gamma resolves.
    """
    # Base living penalty (survival cost)
    base_reward = -1.0
    
    # Terminal state: reward is a function of final assets and skill
    if state.is_terminal():
        # Final life score based on accumulated wealth and skill
        return state.assets * 0.5 + state.skill * 5.0
    
    # Energy penalty (low energy = suffering)
    energy_factor = (state.energy - 5) * 0.5  # -2.5 to +2.5
    
    if action == Action.WORK_CORP:
        # Modest satisfaction from steady work
        return base_reward + 2.0 + energy_factor
    
    elif action == Action.STUDY:
        # Studying is painful in the short term
        return base_reward - 3.0 + energy_factor
    
    elif action == Action.STARTUP:
        # High stress, uncertainty - negative immediate reward
        return base_reward - 5.0 + energy_factor
    
    elif action == Action.RELAX:
        # Immediate pleasure!
        return base_reward + 8.0 + energy_factor
    
    else:
        return base_reward


def sample_transition(state: State, action: Action) -> State:
    """
    Sample a single next state (for simulation).
    """
    transitions = get_transition(state, action)
    probs = [t[0] for t in transitions]
    states = [t[1] for t in transitions]
    
    # Random sample based on probabilities
    r = random.random()
    cumulative = 0.0
    for prob, next_state in transitions:
        cumulative += prob
        if r <= cumulative:
            return next_state
    
    return states[-1]  # Fallback


def get_all_actions() -> List[Action]:
    """Get all available actions."""
    return list(Action)


def is_action_available(state: State, action: Action) -> bool:
    """
    Check if an action is available in a given state.
    
    Some actions may be restricted based on state:
    - STARTUP requires minimum energy
    - STUDY requires minimum energy
    """
    if state.is_terminal():
        return False
    
    if action == Action.STARTUP and state.energy < 2:
        return False  # Too tired to start a business
    
    if action == Action.STUDY and state.energy < 1:
        return False  # Too tired to study
    
    return True


def get_available_actions(state: State) -> List[Action]:
    """Get all available actions for a state."""
    return [a for a in Action if is_action_available(state, a)]
