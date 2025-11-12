"""
Create the famous Monte Carlo simulation curves showing multiple trajectory lines
"""

import numpy as np
import matplotlib.pyplot as plt
from monte_carlo_economic_simulation import QuestCharacteristics, TruthMarketEconomics
import asyncio

# Jimmy Lai characteristics
jimmy_lai = QuestCharacteristics(
    social_impact=0.85,
    political_visibility=0.90,
    global_reach=0.75,
    controversy_level=0.70,
    evidence_accessibility=0.60
)

economics = TruthMarketEconomics(jimmy_lai)

print("🎲 Generating Monte Carlo trajectory curves...")
print("   Running 200 simulations over 30 days...")

# Run 200 simulations - fewer lines but more visible for classic Monte Carlo look
n_sims = 200
days = 30

all_participants = []
all_bounties = []
all_values = []

for i in range(n_sims):
    if (i + 1) % 100 == 0:
        print(f"   Simulation {i+1}/{n_sims}...")

    # Get daily trajectories
    participants = economics.simulate_participant_growth(days, initial_participants=5)
    bounties = economics.simulate_bounty_accumulation(participants, days)

    # Calculate cumulative value
    values = []
    evidence_counts, avg_quality = economics.simulate_evidence_quality(days)
    comments = economics.simulate_comment_activity(participants, evidence_counts, days)

    for day in range(days):
        day_participants = participants[:day+1]
        day_bounties = bounties[:day+1]
        day_evidence = evidence_counts[:day+1]
        day_comments = comments[:day+1]

        value = economics.estimate_value_generated(
            day_participants, day_bounties, day_evidence, day_comments, avg_quality
        )
        values.append(value)

    all_participants.append(participants)
    all_bounties.append(bounties)
    all_values.append(values)

print("   Generating visualizations...")

# Create the famous Monte Carlo curves
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.suptitle(f'Monte Carlo Simulation: {n_sims} Trajectories Over 30 Days\nJimmy Lai Geopolitical Quest',
             fontsize=16, fontweight='bold')

days_array = np.arange(days)

# Calculate percentiles for confidence bands
participants_array = np.array(all_participants)
bounties_array = np.array(all_bounties)
values_array = np.array(all_values)

p10_participants = np.percentile(participants_array, 10, axis=0)
p50_participants = np.percentile(participants_array, 50, axis=0)
p90_participants = np.percentile(participants_array, 90, axis=0)

p10_bounties = np.percentile(bounties_array, 10, axis=0)
p50_bounties = np.percentile(bounties_array, 50, axis=0)
p90_bounties = np.percentile(bounties_array, 90, axis=0)

p10_values = np.percentile(values_array, 10, axis=0)
p50_values = np.percentile(values_array, 50, axis=0)
p90_values = np.percentile(values_array, 90, axis=0)

# 1. Participant Growth Trajectories
ax1 = axes[0, 0]
# Plot all simulations - more visible individual lines
for i in range(n_sims):
    ax1.plot(days_array, all_participants[i], color='royalblue', alpha=0.25, linewidth=0.8)

# Plot percentile lines
ax1.plot(days_array, p10_participants, 'b--', linewidth=2.5, alpha=0.9, label='P10/P90')
ax1.plot(days_array, p90_participants, 'b--', linewidth=2.5, alpha=0.9)
ax1.plot(days_array, p50_participants, 'navy', linewidth=3.5, label='Median (P50)', zorder=100)

ax1.set_xlabel('Day', fontsize=12)
ax1.set_ylabel('Participants', fontsize=12)
ax1.set_title(f'Participant Growth ({n_sims} Simulations)', fontsize=13, fontweight='bold')
ax1.legend(loc='upper left', fontsize=10)
ax1.grid(alpha=0.2, linestyle=':', linewidth=0.5)
ax1.set_xlim(0, days-1)

# Annotation (minimalist)
ax1.text(0.98, 0.05, f'Day 30 Median: {int(p50_participants[-1]):,}',
         transform=ax1.transAxes, fontsize=9, ha='right',
         bbox=dict(boxstyle='round,pad=0.4', facecolor='white', alpha=0.8, edgecolor='darkblue'))

# 2. Bounty Pool Trajectories
ax2 = axes[0, 1]
for i in range(n_sims):
    ax2.plot(days_array, [b/1000 for b in all_bounties[i]], color='forestgreen', alpha=0.25, linewidth=0.8)

ax2.plot(days_array, [b/1000 for b in p10_bounties], 'g--', linewidth=2.5, alpha=0.9, label='P10/P90')
ax2.plot(days_array, [b/1000 for b in p90_bounties], 'g--', linewidth=2.5, alpha=0.9)
ax2.plot(days_array, [b/1000 for b in p50_bounties], 'darkgreen', linewidth=3.5, label='Median (P50)', zorder=100)

ax2.set_xlabel('Day', fontsize=12)
ax2.set_ylabel('Bounty Pool ($1000s)', fontsize=12)
ax2.set_title(f'Bounty Accumulation ({n_sims} Simulations)', fontsize=13, fontweight='bold')
ax2.legend(loc='upper left', fontsize=10)
ax2.grid(alpha=0.2, linestyle=':', linewidth=0.5)
ax2.set_xlim(0, days-1)

ax2.text(0.98, 0.05, f'Day 30 Median: ${p50_bounties[-1]/1000:.1f}K',
         transform=ax2.transAxes, fontsize=9, ha='right',
         bbox=dict(boxstyle='round,pad=0.4', facecolor='white', alpha=0.8, edgecolor='darkgreen'))

# 3. Total Value Generated Trajectories
ax3 = axes[1, 0]
for i in range(n_sims):
    ax3.plot(days_array, [v/1000000 for v in all_values[i]], color='mediumpurple', alpha=0.25, linewidth=0.8)

ax3.plot(days_array, [v/1000000 for v in p10_values], color='purple', linestyle='--', linewidth=2.5, alpha=0.9, label='P10/P90')
ax3.plot(days_array, [v/1000000 for v in p90_values], color='purple', linestyle='--', linewidth=2.5, alpha=0.9)
ax3.plot(days_array, [v/1000000 for v in p50_values], color='indigo', linewidth=3.5, label='Median (P50)', zorder=100)

ax3.set_xlabel('Day', fontsize=12)
ax3.set_ylabel('Total Economic Value (Millions $)', fontsize=12)
ax3.set_title(f'Total Value Generation ({n_sims} Simulations)', fontsize=13, fontweight='bold')
ax3.legend(loc='upper left', fontsize=10)
ax3.grid(alpha=0.2, linestyle=':', linewidth=0.5)
ax3.set_xlim(0, days-1)

ax3.text(0.98, 0.05, f'Day 30 Median: ${p50_values[-1]/1000000:.2f}M',
         transform=ax3.transAxes, fontsize=9, ha='right',
         bbox=dict(boxstyle='round,pad=0.4', facecolor='white', alpha=0.8, edgecolor='darkviolet'))

# 4. Summary Statistics Over Time
ax4 = axes[1, 1]

# Calculate coefficient of variation (std/mean) over time
cv_participants = np.std(participants_array, axis=0) / np.mean(participants_array, axis=0)
cv_bounties = np.std(bounties_array, axis=0) / np.mean(bounties_array, axis=0)
cv_values = np.std(values_array, axis=0) / np.mean(values_array, axis=0)

ax4.plot(days_array, cv_participants, 'o-', label='Participants CV', linewidth=2, markersize=4, color='#3498db')
ax4.plot(days_array, cv_bounties, 's-', label='Bounty CV', linewidth=2, markersize=4, color='#2ecc71')
ax4.plot(days_array, cv_values, '^-', label='Total Value CV', linewidth=2, markersize=4, color='#9b59b6')

ax4.set_xlabel('Day', fontsize=12, fontweight='bold')
ax4.set_ylabel('Coefficient of Variation (σ/μ)', fontsize=12, fontweight='bold')
ax4.set_title('Uncertainty Over Time\n(Lower = More Predictable)', fontsize=13, fontweight='bold')
ax4.legend(loc='upper right')
ax4.grid(alpha=0.3)
ax4.set_xlim(0, days-1)
ax4.axhline(y=0.5, color='r', linestyle='--', alpha=0.5, label='50% uncertainty threshold')

# Add text box
textstr = f'''Final Day Statistics:
Participants: {int(p50_participants[-1]):,} ± {int(np.std(participants_array[:,-1])):,}
Bounty: ${p50_bounties[-1]:,.0f} ± ${np.std(bounties_array[:,-1]):,.0f}
Value: ${p50_values[-1]:,.0f} ± ${np.std(values_array[:,-1]):,.0f}

Convergence Rate: {np.mean([v[-1] > 500000 for v in all_values])*100:.0f}%
'''
ax4.text(0.02, 0.55, textstr, transform=ax4.transAxes, fontsize=9,
        verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

plt.tight_layout()
plt.savefig('monte_carlo_trajectory_curves.png', dpi=200, bbox_inches='tight', facecolor='white')
print("✅ Monte Carlo trajectory curves saved to: monte_carlo_trajectory_curves.png")

# Create second figure: Fan chart (single metric with percentile bands)
fig2, ax = plt.subplots(1, 1, figsize=(14, 8))
fig2.suptitle(f'Monte Carlo Fan Chart: Total Economic Value\n(Percentile Bands from {n_sims} Simulations)',
              fontsize=16, fontweight='bold')

# Calculate percentiles
percentiles = [5, 10, 25, 50, 75, 90, 95]
colors = ['#fee5d9', '#fcbba1', '#fc9272', '#000000', '#9ecae1', '#6baed6', '#3182bd']
alphas = [0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3]
linewidths = [1, 1, 1.5, 3, 1.5, 1, 1]

for i, (p, color, alpha, lw) in enumerate(zip(percentiles, colors, alphas, linewidths)):
    p_values = np.percentile(values_array, p, axis=0)
    label = 'Median' if p == 50 else f'P{p}'
    ax.plot(days_array, [v/1000000 for v in p_values], color=color, alpha=alpha,
            linewidth=lw, label=label, zorder=100 if p==50 else 10)

# Fill between bands
ax.fill_between(days_array,
                [v/1000000 for v in np.percentile(values_array, 5, axis=0)],
                [v/1000000 for v in np.percentile(values_array, 95, axis=0)],
                alpha=0.1, color='#9b59b6', label='90% Confidence (P5-P95)')

ax.fill_between(days_array,
                [v/1000000 for v in np.percentile(values_array, 25, axis=0)],
                [v/1000000 for v in np.percentile(values_array, 75, axis=0)],
                alpha=0.2, color='#8e44ad', label='50% Confidence (P25-P75)')

ax.set_xlabel('Day', fontsize=14, fontweight='bold')
ax.set_ylabel('Total Economic Value (Millions $)', fontsize=14, fontweight='bold')
ax.legend(loc='upper left', fontsize=11)
ax.grid(alpha=0.3)
ax.set_xlim(0, days-1)

# Add value annotations for key percentiles
for p in [5, 50, 95]:
    p_values = np.percentile(values_array, p, axis=0)
    ax.annotate(f'P{p}: ${p_values[-1]/1000000:.2f}M',
               xy=(days-1, p_values[-1]/1000000),
               xytext=(days+1.5, p_values[-1]/1000000),
               fontsize=10, fontweight='bold')

plt.tight_layout()
plt.savefig('monte_carlo_fan_chart.png', dpi=200, bbox_inches='tight', facecolor='white')
print("✅ Monte Carlo fan chart saved to: monte_carlo_fan_chart.png")

print("\n" + "="*80)
print("📊 MONTE CARLO TRAJECTORY VISUALIZATIONS COMPLETE")
print("="*80)
print("\nGenerated files:")
print(f"  • monte_carlo_trajectory_curves.png  - {n_sims} simulation trajectories (4-panel)")
print("  • monte_carlo_fan_chart.png          - Percentile fan chart (single panel)")
print(f"\n✨ Classic Monte Carlo style: {n_sims} semi-transparent trajectories")
print("   creating the famous 'spaghetti plot' effect with confidence envelopes")
print("\n")
