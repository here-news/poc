"""
Create a single, focused Monte Carlo simulation chart showing economic value trajectories
"""

import numpy as np
import matplotlib.pyplot as plt
from monte_carlo_economic_simulation import QuestCharacteristics, TruthMarketEconomics

# Jimmy Lai characteristics
jimmy_lai = QuestCharacteristics(
    social_impact=0.85,
    political_visibility=0.90,
    global_reach=0.75,
    controversy_level=0.70,
    evidence_accessibility=0.60
)

economics = TruthMarketEconomics(jimmy_lai)

print("🎲 Generating Monte Carlo simulation: Economic Value Trajectories")
print("   Running 200 simulations over 30 days...")

# Run simulations
n_sims = 200
days = 30

all_values = []

for i in range(n_sims):
    if (i + 1) % 50 == 0:
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

    all_values.append(values)

print("   Generating visualization...")

# Create single focused chart
fig, ax = plt.subplots(1, 1, figsize=(12, 7))
fig.suptitle('Monte Carlo Simulation: Total Economic Value\nJimmy Lai Geopolitical Quest (200 Trajectories, 30 Days)',
             fontsize=14, fontweight='bold', y=0.98)

days_array = np.arange(days)
values_array = np.array(all_values)

# Calculate percentiles
p5_values = np.percentile(values_array, 5, axis=0)
p10_values = np.percentile(values_array, 10, axis=0)
p25_values = np.percentile(values_array, 25, axis=0)
p50_values = np.percentile(values_array, 50, axis=0)
p75_values = np.percentile(values_array, 75, axis=0)
p90_values = np.percentile(values_array, 90, axis=0)
p95_values = np.percentile(values_array, 95, axis=0)

# Plot all simulation trajectories with elegant styling
for i in range(n_sims):
    ax.plot(days_array, [v/1000000 for v in all_values[i]],
            color='#1f77b4', alpha=0.15, linewidth=0.6, solid_capstyle='round')

# Plot key percentile lines (no fill - cleaner look)
ax.plot(days_array, [v/1000000 for v in p95_values],
        color='#d62728', linestyle='-', linewidth=2.5, alpha=0.85, label='95th Percentile', zorder=10)
ax.plot(days_array, [v/1000000 for v in p75_values],
        color='#ff7f0e', linestyle='-', linewidth=2, alpha=0.75, label='75th Percentile', zorder=9)
ax.plot(days_array, [v/1000000 for v in p50_values],
        color='#2ca02c', linewidth=3, label='Median', zorder=11)
ax.plot(days_array, [v/1000000 for v in p25_values],
        color='#ff7f0e', linestyle='-', linewidth=2, alpha=0.75, label='25th Percentile', zorder=9)
ax.plot(days_array, [v/1000000 for v in p5_values],
        color='#d62728', linestyle='-', linewidth=2.5, alpha=0.85, label='5th Percentile', zorder=10)

# Styling
ax.set_xlabel('Days', fontsize=12)
ax.set_ylabel('Total Economic Value ($ Millions)', fontsize=12)
ax.legend(loc='upper left', fontsize=10, framealpha=0.95, edgecolor='gray')
ax.grid(True, alpha=0.3, linestyle='-', linewidth=0.5, color='gray')
ax.set_xlim(0, days-1)
ax.set_ylim(bottom=0)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

# Add minimal annotation
textstr = f'''n = {n_sims} simulations

Median: ${p50_values[-1]/1000000:.2f}M
90% CI: ${p5_values[-1]/1000000:.2f}M – ${p95_values[-1]/1000000:.2f}M'''

ax.text(0.97, 0.65, textstr, transform=ax.transAxes, fontsize=9.5,
        verticalalignment='top', horizontalalignment='right',
        bbox=dict(boxstyle='round,pad=0.6', facecolor='white', alpha=0.92, edgecolor='#cccccc', linewidth=1.5))

plt.tight_layout()
plt.savefig('monte_carlo_simple.png', dpi=300, bbox_inches='tight', facecolor='white')
print("✅ Monte Carlo visualization saved to: monte_carlo_simple.png")

print("\n" + "="*80)
print("📊 MONTE CARLO SIMULATION COMPLETE")
print("="*80)
print(f"\nGenerated: monte_carlo_simple.png")
print(f"  • {n_sims} simulation trajectories")
print(f"  • Day 30 Median: ${p50_values[-1]/1000000:.2f}M")
print(f"  • Day 30 P95: ${p95_values[-1]/1000000:.2f}M")
print(f"  • Day 30 P5: ${p5_values[-1]/1000000:.2f}M")
print("\n")
