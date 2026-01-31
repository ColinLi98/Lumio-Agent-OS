"""
Lumi Life Optimizer - Streamlit Dashboard

Interactive visualization of the "Gamma Effect":
How vision (γ) changes your life trajectory.

Run with: streamlit run app/main.py
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from core.states import create_state
from core.actions import Action
from core.solver import (
    ValueIterationAgent, 
    simulate_life, 
    get_policy_summary,
    compare_policies
)


# Page config
st.set_page_config(
    page_title="Lumi Life Optimizer",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
    }
    .stMetric {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 10px;
    }
</style>
""", unsafe_allow_html=True)


def main():
    # Header
    st.markdown('<div class="main-header">🎯 Lumi Life Optimizer</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Discover how Vision (γ) shapes your destiny through the Bellman Equation</div>', unsafe_allow_html=True)
    
    # Sidebar Controls
    st.sidebar.header("⚙️ Life Parameters")
    
    # Gamma slider - THE KEY PARAMETER
    st.sidebar.markdown("### 🔮 Vision Factor (Gamma)")
    st.sidebar.markdown("*How much you value the future vs. now*")
    gamma = st.sidebar.slider(
        "γ (Gamma)",
        min_value=0.0,
        max_value=0.99,
        value=0.85,
        step=0.01,
        help="0 = Pure hedonist (live for today), 0.99 = Pure visionary (invest in future)"
    )
    
    # Visual indicator for gamma
    if gamma < 0.3:
        gamma_desc = "🍺 Short-sighted: 'YOLO! Enjoy life now!'"
        gamma_color = "#ff6b6b"
    elif gamma < 0.6:
        gamma_desc = "⚖️ Balanced: 'Some now, some later'"
        gamma_color = "#feca57"
    elif gamma < 0.85:
        gamma_desc = "📈 Future-focused: 'Invest in myself'"
        gamma_color = "#48dbfb"
    else:
        gamma_desc = "🚀 Visionary: 'Delayed gratification master'"
        gamma_color = "#1dd1a1"
    
    st.sidebar.markdown(f'<p style="color:{gamma_color};font-weight:bold">{gamma_desc}</p>', unsafe_allow_html=True)
    
    # Risk tolerance
    st.sidebar.markdown("### 🎲 Risk Tolerance")
    startup_success = st.sidebar.slider(
        "Startup Success Rate",
        min_value=0.05,
        max_value=0.30,
        value=0.10,
        step=0.01,
        format="%.0f%%",
        help="Probability that a startup venture succeeds"
    )
    
    # Starting conditions
    st.sidebar.markdown("### 👤 Starting Conditions")
    start_assets = st.sidebar.slider("Starting Assets", 0, 50, 20, 10)
    start_skill = st.sidebar.slider("Starting Skill", 0, 6, 2, 2)
    start_energy = st.sidebar.slider("Starting Energy", 2, 10, 8, 2)
    
    # Create start state
    start_state = create_state(age=20, assets=start_assets, skill=start_skill, energy=start_energy)
    
    # Solve button
    if st.sidebar.button("🔄 Compute Optimal Path", type="primary", use_container_width=True):
        st.session_state.should_solve = True
    
    # Initialize or retrieve solver results
    if 'should_solve' not in st.session_state:
        st.session_state.should_solve = True
    
    if st.session_state.should_solve:
        with st.spinner("🧠 Running Value Iteration (Bellman Solver)..."):
            # Solve for current gamma
            agent = ValueIterationAgent(
                gamma=gamma,
                startup_success_prob=startup_success
            )
            V, policy = agent.solve()
            
            # Simulate life
            trajectory = simulate_life(policy, start_state, startup_success)
            summary = get_policy_summary(trajectory)
            
            # Also get a "greedy" comparison (gamma=0.1)
            greedy_agent = ValueIterationAgent(gamma=0.1, startup_success_prob=startup_success)
            _, greedy_policy = greedy_agent.solve()
            greedy_trajectory = simulate_life(greedy_policy, start_state, startup_success)
            greedy_summary = get_policy_summary(greedy_trajectory)
            
            # Store in session state
            st.session_state.trajectory = trajectory
            st.session_state.summary = summary
            st.session_state.greedy_trajectory = greedy_trajectory
            st.session_state.greedy_summary = greedy_summary
            st.session_state.agent = agent
            st.session_state.should_solve = False
    
    # Retrieve from session state
    trajectory = st.session_state.get('trajectory', [])
    summary = st.session_state.get('summary', {})
    greedy_trajectory = st.session_state.get('greedy_trajectory', [])
    greedy_summary = st.session_state.get('greedy_summary', {})
    agent = st.session_state.get('agent')
    
    if not trajectory:
        st.warning("Click 'Compute Optimal Path' to run the simulation.")
        return
    
    # Main Content - Three columns for metrics
    st.markdown("---")
    st.markdown("### 📊 Life Outcome Comparison")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "🎯 Your Final Assets",
            f"${summary.get('final_assets', 0) * 10}K",
            delta=f"+${(summary.get('final_assets', 0) - greedy_summary.get('final_assets', 0)) * 10}K vs Greedy"
        )
    
    with col2:
        st.metric(
            "🧠 Final Skill Level",
            summary.get('final_skill', 0),
            delta=f"+{summary.get('final_skill', 0) - greedy_summary.get('final_skill', 0)} vs Greedy"
        )
    
    with col3:
        st.metric(
            "💰 Lifetime Reward",
            f"{summary.get('total_reward', 0):.1f}",
            delta=f"{summary.get('total_reward', 0) - greedy_summary.get('total_reward', 0):.1f} vs Greedy"
        )
    
    with col4:
        st.metric(
            "⚡ Solver Iterations",
            agent.iterations if agent else 0
        )
    
    # Charts
    st.markdown("---")
    
    tab1, tab2, tab3 = st.tabs(["📈 Life Trajectory", "🎬 Career Timeline", "🔬 The Bellman Equation"])
    
    with tab1:
        # Create trajectory DataFrame
        df = pd.DataFrame([
            {
                'Age': s.age,
                'Assets': s.assets,
                'Skill': s.skill,
                'Energy': s.energy,
                'Action': a.value,
                'Reward': r
            }
            for s, a, r in trajectory
        ])
        
        df_greedy = pd.DataFrame([
            {
                'Age': s.age,
                'Assets': s.assets,
            }
            for s, a, r in greedy_trajectory
        ])
        
        # Combined chart
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Assets Over Time', 'Skill Development', 'Energy Levels', 'Cumulative Reward'),
            vertical_spacing=0.12,
            horizontal_spacing=0.1
        )
        
        # Assets comparison
        fig.add_trace(
            go.Scatter(x=df['Age'], y=df['Assets'], name=f'Your Path (γ={gamma})', 
                      line=dict(color='#667eea', width=3)),
            row=1, col=1
        )
        fig.add_trace(
            go.Scatter(x=df_greedy['Age'], y=df_greedy['Assets'], name='Greedy Path (γ=0.1)',
                      line=dict(color='#ff6b6b', width=2, dash='dash')),
            row=1, col=1
        )
        
        # Skill
        fig.add_trace(
            go.Scatter(x=df['Age'], y=df['Skill'], name='Skill', 
                      line=dict(color='#1dd1a1', width=2), showlegend=False),
            row=1, col=2
        )
        
        # Energy
        fig.add_trace(
            go.Scatter(x=df['Age'], y=df['Energy'], name='Energy',
                      line=dict(color='#feca57', width=2), showlegend=False),
            row=2, col=1
        )
        
        # Cumulative reward
        df['Cumulative_Reward'] = df['Reward'].cumsum()
        fig.add_trace(
            go.Scatter(x=df['Age'], y=df['Cumulative_Reward'], name='Cumulative Reward',
                      line=dict(color='#54a0ff', width=2), showlegend=False),
            row=2, col=2
        )
        
        fig.update_layout(
            height=600,
            legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1)
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    with tab2:
        st.markdown("### 🎬 Your Optimal Career Path")
        
        phases = summary.get('phases', [])
        
        # Create timeline visualization
        action_colors = {
            'work_corp': '#48dbfb',
            'study': '#ff9ff3',
            'startup': '#feca57',
            'relax': '#1dd1a1'
        }
        
        action_emojis = {
            'work_corp': '💼',
            'study': '📚',
            'startup': '🚀',
            'relax': '🏖️'
        }
        
        if phases:
            # Gantt-style chart
            fig_timeline = go.Figure()
            
            for i, phase in enumerate(phases):
                action = phase['action']
                fig_timeline.add_trace(go.Bar(
                    x=[phase['end_age'] - phase['start_age']],
                    y=['Life'],
                    orientation='h',
                    base=phase['start_age'],
                    name=f"{action_emojis.get(action, '❓')} {action.upper()}",
                    marker_color=action_colors.get(action, '#999'),
                    text=f"Age {phase['start_age']}-{phase['end_age']}: {action.upper()}",
                    textposition='inside',
                    showlegend=True
                ))
            
            fig_timeline.update_layout(
                height=150,
                barmode='stack',
                xaxis_title="Age",
                yaxis_visible=False,
                legend=dict(orientation='h'),
                margin=dict(l=20, r=20, t=20, b=40)
            )
            
            st.plotly_chart(fig_timeline, use_container_width=True)
            
            # Phase details
            st.markdown("#### 📋 Career Phases Breakdown")
            
            cols = st.columns(len(phases[:6]))  # Max 6 phases shown
            for i, phase in enumerate(phases[:6]):
                with cols[i]:
                    action = phase['action']
                    duration = phase['end_age'] - phase['start_age']
                    st.markdown(f"""
                    <div style="text-align:center; padding:1rem; background:linear-gradient(135deg, {action_colors.get(action, '#999')}40, {action_colors.get(action, '#999')}20); border-radius:10px; margin-bottom:1rem;">
                        <div style="font-size:2rem">{action_emojis.get(action, '❓')}</div>
                        <div style="font-weight:bold">{action.upper()}</div>
                        <div style="color:#666">Age {phase['start_age']}-{phase['end_age']}</div>
                        <div style="color:#999">{duration} years</div>
                    </div>
                    """, unsafe_allow_html=True)
    
    with tab3:
        st.markdown("### 🔬 The Math Behind 'Vision'")
        
        st.latex(r"V(s) = \max_a \left[ R(s,a) + \gamma \sum_{s'} P(s'|s,a) \cdot V(s') \right]")
        
        st.markdown("""
        #### Key Insight: **Gamma (γ) is your "Vision Factor"**
        
        | Component | Meaning |
        |-----------|---------|
        | **V(s)** | Value of being in state s (your "life score") |
        | **R(s,a)** | Immediate reward from action a (short-term pleasure/pain) |
        | **γ (Gamma)** | How much you discount future rewards (0=ignore future, 1=equal weight) |
        | **P(s'|s,a)** | Probability of reaching state s' after action a |
        
        #### The "Delayed Gratification" Effect
        
        - **Low γ (0.1)**: Only cares about immediate R(s,a). Chooses **RELAX** because it feels good *now*.
        - **High γ (0.95)**: Heavily weights future V(s'). Chooses **STUDY→STARTUP** because the *compounded future* is worth the pain.
        
        This is why γ is called "Vision" — it's mathematically how much you can *see* into the future.
        """)
        
        # Show the tradeoff
        st.markdown("#### 📊 The J-Curve Effect")
        
        col_a, col_b = st.columns(2)
        
        with col_a:
            st.markdown("""
            **Low Gamma Path (Greedy/YOLO)**
            - Feels good early (relaxation)
            - Linear or declining trajectory
            - Ends up poor but "lived in the moment"
            """)
        
        with col_b:
            st.markdown("""
            **High Gamma Path (Visionary)**
            - Painful early (study, startup struggles)
            - J-Curve: dip then explosive growth
            - Ends up wealthy and skilled
            """)
    
    # Footer
    st.markdown("---")
    st.markdown(
        "<p style='text-align:center;color:#999'>Built with ❤️ by Lumi.AI | "
        "Powered by Bellman Value Iteration</p>",
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()
