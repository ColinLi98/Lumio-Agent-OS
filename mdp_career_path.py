from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

State = str
Action = str
Transition = List[Tuple[float, State]]


@dataclass
class MDP:
    states: List[State]
    actions: Dict[State, List[Action]]
    transitions: Dict[State, Dict[Action, Transition]]
    action_rewards: Dict[State, Dict[Action, float]]
    terminal_states: List[State]
    terminal_bonus: Dict[State, float]

    def is_terminal(self, state: State) -> bool:
        return state in self.terminal_states

    def reward(self, state: State, action: Action, next_state: State) -> float:
        base = self.action_rewards[state][action]
        bonus = self.terminal_bonus.get(next_state, 0.0)
        return base + bonus


def value_iteration(mdp: MDP, gamma: float = 0.95, theta: float = 1e-6) -> Tuple[Dict[State, float], Dict[State, Optional[Action]]]:
    v: Dict[State, float] = {s: 0.0 for s in mdp.states}

    while True:
        delta = 0.0
        for state in mdp.states:
            if mdp.is_terminal(state):
                continue
            best_value = float("-inf")
            for action in mdp.actions[state]:
                expected = 0.0
                for prob, next_state in mdp.transitions[state][action]:
                    expected += prob * (mdp.reward(state, action, next_state) + gamma * v[next_state])
                best_value = max(best_value, expected)
            delta = max(delta, abs(best_value - v[state]))
            v[state] = best_value
        if delta < theta:
            break

    policy: Dict[State, Optional[Action]] = {}
    for state in mdp.states:
        if mdp.is_terminal(state):
            policy[state] = None
            continue
        best_action = max(
            mdp.actions[state],
            key=lambda action: sum(
                prob * (mdp.reward(state, action, next_state) + gamma * v[next_state])
                for prob, next_state in mdp.transitions[state][action]
            ),
        )
        policy[state] = best_action

    return v, policy


def greedy_policy(mdp: MDP) -> Dict[State, Optional[Action]]:
    policy: Dict[State, Optional[Action]] = {}
    for state in mdp.states:
        if mdp.is_terminal(state):
            policy[state] = None
            continue
        policy[state] = max(mdp.actions[state], key=lambda action: mdp.action_rewards[state][action])
    return policy


def follow_policy(
    mdp: MDP,
    start_state: State,
    policy: Dict[State, Optional[Action]],
    max_steps: int = 8,
) -> Tuple[List[Tuple[State, Action, State]], State, bool]:
    path: List[Tuple[State, Action, State]] = []
    current = start_state
    visited = set()
    loop_detected = False

    for _ in range(max_steps):
        if mdp.is_terminal(current):
            break
        if current in visited:
            loop_detected = True
            break
        visited.add(current)
        action = policy[current]
        if action is None:
            break
        transitions = mdp.transitions[current][action]
        next_state = max(transitions, key=lambda item: item[0])[1]
        path.append((current, action, next_state))
        current = next_state

    return path, current, loop_detected


def format_path(path: List[Tuple[State, Action, State]]) -> str:
    if not path:
        return "No steps."
    chunks = []
    for state, action, next_state in path:
        chunks.append(f"{state} --{action}--> {next_state}")
    return " | ".join(chunks)


def build_career_mdp() -> MDP:
    states = [
        "Student",
        "Junior_Dev",
        "Senior_Dev",
        "Founder",
        "Bankrupt",
        "Retired_Rich",
        "Retired_Poor",
    ]

    terminal_states = ["Bankrupt", "Retired_Rich", "Retired_Poor"]

    actions = {
        "Student": ["Study", "Work at Big Tech", "Startup", "Party"],
        "Junior_Dev": ["Study", "Work at Big Tech", "Startup", "Party"],
        "Senior_Dev": ["Work at Big Tech", "Startup", "Party"],
        "Founder": ["Startup", "Work at Big Tech", "Party"],
        "Bankrupt": [],
        "Retired_Rich": [],
        "Retired_Poor": [],
    }

    action_rewards = {
        "Student": {
            "Study": -1.0,
            "Work at Big Tech": 1.5,
            "Startup": -4.0,
            "Party": 6.0,
        },
        "Junior_Dev": {
            "Study": -1.0,
            "Work at Big Tech": 2.0,
            "Startup": -3.0,
            "Party": 5.0,
        },
        "Senior_Dev": {
            "Work at Big Tech": 3.5,
            "Startup": -2.0,
            "Party": 4.5,
        },
        "Founder": {
            "Startup": -3.0,
            "Work at Big Tech": 4.0,
            "Party": 3.0,
        },
        "Bankrupt": {},
        "Retired_Rich": {},
        "Retired_Poor": {},
    }

    transitions = {
        "Student": {
            "Study": [(0.8, "Junior_Dev"), (0.2, "Student")],
            "Work at Big Tech": [(0.6, "Junior_Dev"), (0.2, "Senior_Dev"), (0.2, "Retired_Poor")],
            "Startup": [(0.5, "Founder"), (0.25, "Bankrupt"), (0.25, "Retired_Rich")],
            "Party": [(0.6, "Retired_Poor"), (0.2, "Student"), (0.2, "Junior_Dev")],
        },
        "Junior_Dev": {
            "Study": [(0.7, "Senior_Dev"), (0.3, "Junior_Dev")],
            "Work at Big Tech": [(0.5, "Senior_Dev"), (0.25, "Junior_Dev"), (0.25, "Retired_Poor")],
            "Startup": [(0.35, "Founder"), (0.35, "Bankrupt"), (0.3, "Retired_Rich")],
            "Party": [(0.4, "Retired_Poor"), (0.4, "Junior_Dev"), (0.2, "Senior_Dev")],
        },
        "Senior_Dev": {
            "Work at Big Tech": [(0.25, "Retired_Rich"), (0.35, "Senior_Dev"), (0.4, "Retired_Poor")],
            "Startup": [(0.3, "Founder"), (0.4, "Bankrupt"), (0.3, "Retired_Rich")],
            "Party": [(0.5, "Retired_Poor"), (0.3, "Senior_Dev"), (0.2, "Retired_Rich")],
        },
        "Founder": {
            "Startup": [(0.55, "Retired_Rich"), (0.3, "Bankrupt"), (0.15, "Founder")],
            "Work at Big Tech": [(0.6, "Retired_Rich"), (0.3, "Retired_Poor"), (0.1, "Bankrupt")],
            "Party": [(0.5, "Bankrupt"), (0.3, "Retired_Poor"), (0.2, "Retired_Rich")],
        },
        "Bankrupt": {},
        "Retired_Rich": {},
        "Retired_Poor": {},
    }

    terminal_bonus = {
        "Retired_Rich": 190.0,
        "Retired_Poor": -45.0,
        "Bankrupt": -100.0,
    }

    return MDP(
        states=states,
        actions=actions,
        transitions=transitions,
        action_rewards=action_rewards,
        terminal_states=terminal_states,
        terminal_bonus=terminal_bonus,
    )


def main() -> None:
    mdp = build_career_mdp()
    _, optimal_policy = value_iteration(mdp, gamma=0.95)
    greedy = greedy_policy(mdp)

    bellman_path, bellman_end, bellman_loop = follow_policy(mdp, "Student", optimal_policy)
    greedy_path, greedy_end, greedy_loop = follow_policy(mdp, "Student", greedy)

    print("Bellman optimal policy path from Student:")
    print(format_path(bellman_path))
    print(f"End state: {bellman_end}" + (" (loop detected)" if bellman_loop else ""))
    print()
    print("Greedy policy path from Student (highest immediate reward only):")
    print(format_path(greedy_path))
    print(f"End state: {greedy_end}" + (" (loop detected)" if greedy_loop else ""))


if __name__ == "__main__":
    main()
