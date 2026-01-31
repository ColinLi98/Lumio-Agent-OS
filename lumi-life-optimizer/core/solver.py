"""
Value Iteration Solver for the Life Optimizer MDP

Implements the Bellman equation to find optimal life strategies:
    V(s) = max_a [ R(s,a) + γ * Σ P(s'|s,a) * V(s') ]

The key insight: Gamma (γ) represents "vision" or "delayed gratification":
- γ close to 0: Short-sighted, prefers immediate reward (RELAX)
- γ close to 1: Visionary, invests in future (STUDY → STARTUP → RETIRE_RICH)
"""

from typing import Dict, List, Tuple, Optional
from collections import defaultdict

from .states import State, get_all_states, create_state, AGE_RANGE
from .actions import (
    Action, 
    get_transition, 
    get_reward, 
    get_available_actions,
    sample_transition,
    DEFAULT_STARTUP_SUCCESS_PROB
)


class ValueIterationAgent:
    """
    Value Iteration solver for the Life MDP.
    
    Finds the optimal value function V(s) and policy π(s) 
    for a given discount factor gamma.
    """
    
    def __init__(
        self, 
        gamma: float = 0.95,
        startup_success_prob: float = DEFAULT_STARTUP_SUCCESS_PROB,
        threshold: float = 0.01,
        max_iterations: int = 1000
    ):
        """
        Initialize the solver.
        
        Args:
            gamma: Discount factor (0 to 1). Higher = more future-oriented.
            startup_success_prob: Probability of startup success (for risk tolerance).
            threshold: Convergence threshold for value iteration.
            max_iterations: Maximum iterations before stopping.
        """
        self.gamma = gamma
        self.startup_success_prob = startup_success_prob
        self.threshold = threshold
        self.max_iterations = max_iterations
        
        # Value function: V[state] = expected discounted reward
        self.V: Dict[State, float] = {}
        
        # Policy: π[state] = best action
        self.policy: Dict[State, Action] = {}
        
        # Tracking
        self.solved = False
        self.iterations = 0
        self.convergence_history: List[float] = []
    
    def solve(self) -> Tuple[Dict[State, float], Dict[State, Action]]:
        """
        Run value iteration to find optimal V and policy.
        
        Returns:
            Tuple of (value_function, policy)
        """
        # Initialize V(s) = 0 for all states
        states = list(get_all_states())
        for s in states:
            self.V[s] = 0.0
        
        # Value iteration loop
        for iteration in range(self.max_iterations):
            delta = 0.0
            
            for s in states:
                if s.is_terminal():
                    # Terminal state value is just the terminal reward
                    terminal_reward = s.assets * 0.5 + s.skill * 5.0
                    self.V[s] = terminal_reward
                    continue
                
                old_v = self.V[s]
                
                # Bellman update: V(s) = max_a [R(s,a) + γ * Σ P(s'|s,a) * V(s')]
                best_value = float('-inf')
                best_action = None
                
                available_actions = get_available_actions(s)
                if not available_actions:
                    continue
                
                for a in available_actions:
                    # Immediate reward
                    r = get_reward(s, a)
                    
                    # Expected future value
                    transitions = get_transition(s, a, self.startup_success_prob)
                    expected_future = sum(
                        prob * self.V.get(next_s, 0.0) 
                        for prob, next_s in transitions
                    )
                    
                    # Bellman value for this action
                    q_value = r + self.gamma * expected_future
                    
                    if q_value > best_value:
                        best_value = q_value
                        best_action = a
                
                self.V[s] = best_value
                if best_action:
                    self.policy[s] = best_action
                
                delta = max(delta, abs(old_v - best_value))
            
            self.convergence_history.append(delta)
            self.iterations = iteration + 1
            
            # Check convergence
            if delta < self.threshold:
                break
        
        self.solved = True
        return self.V, self.policy
    
    def get_action(self, state: State) -> Optional[Action]:
        """Get the optimal action for a state."""
        if not self.solved:
            self.solve()
        return self.policy.get(state)
    
    def get_value(self, state: State) -> float:
        """Get the value of a state."""
        if not self.solved:
            self.solve()
        return self.V.get(state, 0.0)


def simulate_life(
    policy: Dict[State, Action],
    start_state: Optional[State] = None,
    startup_success_prob: float = DEFAULT_STARTUP_SUCCESS_PROB
) -> List[Tuple[State, Action, float]]:
    """
    Simulate a life trajectory following a policy.
    
    Args:
        policy: State -> Action mapping (from solver)
        start_state: Initial state (default: age 20, moderate assets/skill/energy)
        startup_success_prob: For stochastic transitions
    
    Returns:
        List of (state, action_taken, reward) tuples
    """
    if start_state is None:
        start_state = create_state(age=20, assets=20, skill=2, energy=8)
    
    trajectory: List[Tuple[State, Action, float]] = []
    current_state = start_state
    
    while not current_state.is_terminal():
        # Get action from policy (or default)
        action = policy.get(current_state, Action.WORK_CORP)
        
        # Get immediate reward
        reward = get_reward(current_state, action)
        
        # Record
        trajectory.append((current_state, action, reward))
        
        # Transition to next state (stochastic)
        current_state = sample_transition(current_state, action)
    
    # Add terminal state
    terminal_reward = get_reward(current_state, Action.RELAX)  # Terminal reward
    trajectory.append((current_state, Action.RELAX, terminal_reward))
    
    return trajectory


def compare_policies(
    gamma_visionary: float = 0.95,
    gamma_shortsighted: float = 0.1,
    startup_success_prob: float = DEFAULT_STARTUP_SUCCESS_PROB,
    start_state: Optional[State] = None
) -> Tuple[List[Tuple[State, Action, float]], List[Tuple[State, Action, float]]]:
    """
    Compare life trajectories for visionary vs short-sighted agents.
    
    Returns:
        Tuple of (visionary_trajectory, shortsighted_trajectory)
    """
    # Solve for visionary
    visionary_agent = ValueIterationAgent(
        gamma=gamma_visionary,
        startup_success_prob=startup_success_prob
    )
    _, visionary_policy = visionary_agent.solve()
    
    # Solve for short-sighted
    shortsighted_agent = ValueIterationAgent(
        gamma=gamma_shortsighted,
        startup_success_prob=startup_success_prob
    )
    _, shortsighted_policy = shortsighted_agent.solve()
    
    # Simulate both
    if start_state is None:
        start_state = create_state(age=20, assets=20, skill=2, energy=8)
    
    visionary_life = simulate_life(visionary_policy, start_state, startup_success_prob)
    shortsighted_life = simulate_life(shortsighted_policy, start_state, startup_success_prob)
    
    return visionary_life, shortsighted_life


def get_policy_summary(trajectory: List[Tuple[State, Action, float]]) -> Dict[str, any]:
    """
    Summarize a life trajectory.
    
    Returns:
        Dictionary with summary statistics
    """
    if not trajectory:
        return {}
    
    total_reward = sum(r for _, _, r in trajectory)
    final_state = trajectory[-1][0]
    
    # Count action frequencies
    action_counts = defaultdict(int)
    for _, action, _ in trajectory:
        action_counts[action.value] += 1
    
    # Career phases: group consecutive same actions
    phases = []
    current_action = None
    phase_start = None
    
    for state, action, _ in trajectory:
        if action != current_action:
            if current_action is not None:
                phases.append({
                    'action': current_action.value,
                    'start_age': phase_start,
                    'end_age': state.age - 1
                })
            current_action = action
            phase_start = state.age
    
    # Add final phase
    if current_action is not None:
        phases.append({
            'action': current_action.value,
            'start_age': phase_start,
            'end_age': 80
        })
    
    return {
        'total_reward': total_reward,
        'final_assets': final_state.assets,
        'final_skill': final_state.skill,
        'action_counts': dict(action_counts),
        'phases': phases,
        'trajectory_length': len(trajectory)
    }
