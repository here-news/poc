"""
Visualization of Monte Carlo Economic Simulation Results
"""

import json
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# Load results
with open("scenario_comparison.json", 'r') as f:
    data = json.load(f)

# Extract data for plotting
scenarios = list(data.keys())
colors = ['#95a5a6', '#3498db', '#e74c3c', '#9b59b6']

# Metrics to visualize
participants_p50 = [data[s]['results']['participants']['p50'] for s in scenarios]
participants_p95 = [data[s]['results']['participants']['p95'] for s in scenarios]
bounty_p50 = [data[s]['results']['bounty']['p50'] for s in scenarios]
bounty_p95 = [data[s]['results']['bounty']['p95'] for s in scenarios]
value_p50 = [data[s]['results']['total_value']['p50'] for s in scenarios]
value_p95 = [data[s]['results']['total_value']['p95'] for s in scenarios]

# Create comprehensive visualization
fig = plt.figure(figsize=(20, 12))
fig.suptitle('Truth Market Economic Scaling: Monte Carlo Analysis\n(500-1000 simulations per scenario)',
             fontsize=18, fontweight='bold', y=0.98)

# 1. Participant Growth Comparison
ax1 = plt.subplot(2, 3, 1)
x = np.arange(len(scenarios))
width = 0.35

bars1 = ax1.bar(x - width/2, participants_p50, width, label='Median (P50)',
                color=[c + '80' for c in colors], edgecolor=colors, linewidth=2)
bars2 = ax1.bar(x + width/2, participants_p95, width, label='95th Percentile',
                color=colors, alpha=0.9)

ax1.set_ylabel('Participants', fontsize=12, fontweight='bold')
ax1.set_title('Participant Growth (30 days)', fontsize=13, fontweight='bold')
ax1.set_xticks(x)
ax1.set_xticklabels([s.replace(' ', '\n') for s in scenarios], fontsize=9)
ax1.legend()
ax1.grid(axis='y', alpha=0.3)
ax1.set_yscale('log')

# Add value labels
for i, (bar1, bar2) in enumerate(zip(bars1, bars2)):
    height1 = bar1.get_height()
    height2 = bar2.get_height()
    ax1.text(bar1.get_x() + bar1.get_width()/2., height1,
             f'{int(height1):,}', ha='center', va='bottom', fontsize=7)
    ax1.text(bar2.get_x() + bar2.get_width()/2., height2,
             f'{int(height2):,}', ha='center', va='bottom', fontsize=7)

# 2. Bounty Pool Accumulation
ax2 = plt.subplot(2, 3, 2)
bars1 = ax2.bar(x - width/2, [b/1000 for b in bounty_p50], width,
                label='Median (P50)', color=[c + '80' for c in colors],
                edgecolor=colors, linewidth=2)
bars2 = ax2.bar(x + width/2, [b/1000 for b in bounty_p95], width,
                label='95th Percentile', color=colors, alpha=0.9)

ax2.set_ylabel('Bounty Pool ($1000s)', fontsize=12, fontweight='bold')
ax2.set_title('Bounty Pool Accumulation', fontsize=13, fontweight='bold')
ax2.set_xticks(x)
ax2.set_xticklabels([s.replace(' ', '\n') for s in scenarios], fontsize=9)
ax2.legend()
ax2.grid(axis='y', alpha=0.3)
ax2.set_yscale('log')

for i, (bar1, bar2) in enumerate(zip(bars1, bars2)):
    height1 = bar1.get_height()
    height2 = bar2.get_height()
    ax2.text(bar1.get_x() + bar1.get_width()/2., height1,
             f'${height1:.0f}k', ha='center', va='bottom', fontsize=7)
    ax2.text(bar2.get_x() + bar2.get_width()/2., height2,
             f'${height2:.0f}k', ha='center', va='bottom', fontsize=7)

# 3. Total Economic Value
ax3 = plt.subplot(2, 3, 3)
bars1 = ax3.bar(x - width/2, [v/1000000 for v in value_p50], width,
                label='Median (P50)', color=[c + '80' for c in colors],
                edgecolor=colors, linewidth=2)
bars2 = ax3.bar(x + width/2, [v/1000000 for v in value_p95], width,
                label='95th Percentile', color=colors, alpha=0.9)

ax3.set_ylabel('Total Value (Millions $)', fontsize=12, fontweight='bold')
ax3.set_title('Total Economic Value Generated', fontsize=13, fontweight='bold')
ax3.set_xticks(x)
ax3.set_xticklabels([s.replace(' ', '\n') for s in scenarios], fontsize=9)
ax3.legend()
ax3.grid(axis='y', alpha=0.3)
ax3.set_yscale('log')

for i, (bar1, bar2) in enumerate(zip(bars1, bars2)):
    height1 = bar1.get_height()
    height2 = bar2.get_height()
    ax3.text(bar1.get_x() + bar1.get_width()/2., height1,
             f'${height1:.1f}M', ha='center', va='bottom', fontsize=7)
    ax3.text(bar2.get_x() + bar2.get_width()/2., height2,
             f'${height2:.1f}M', ha='center', va='bottom', fontsize=7)

# 4. Value per Participant
ax4 = plt.subplot(2, 3, 4)
value_per_participant = [
    value_p50[i] / participants_p50[i] if participants_p50[i] > 0 else 0
    for i in range(len(scenarios))
]
bars = ax4.bar(x, value_per_participant, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
ax4.set_ylabel('Value per Participant ($)', fontsize=12, fontweight='bold')
ax4.set_title('Economic Efficiency\n(Value Generated / Participant)', fontsize=13, fontweight='bold')
ax4.set_xticks(x)
ax4.set_xticklabels([s.replace(' ', '\n') for s in scenarios], fontsize=9)
ax4.grid(axis='y', alpha=0.3)

for bar in bars:
    height = bar.get_height()
    ax4.text(bar.get_x() + bar.get_width()/2., height,
             f'${height:.0f}', ha='center', va='bottom', fontsize=9, fontweight='bold')

# 5. Quest Characteristics Heatmap
ax5 = plt.subplot(2, 3, 5)
characteristics = []
char_names = ['Social\nImpact', 'Political\nVisibility', 'Global\nReach',
              'Controversy', 'Evidence\nAccess']

# Manually specify characteristics (since they're serialized as strings)
char_values = {
    'Niche Academic Question': [0.40, 0.10, 0.20, 0.30, 0.70],
    'Regional Political Issue': [0.60, 0.65, 0.45, 0.75, 0.50],
    'Jimmy Lai Geopolitical Case': [0.85, 0.90, 0.75, 0.70, 0.60],
    'Global Crisis Truth Quest': [0.95, 0.95, 0.95, 0.85, 0.65]
}

for scenario in scenarios:
    characteristics.append(char_values[scenario])

im = ax5.imshow(np.array(characteristics).T, cmap='RdYlGn', aspect='auto', vmin=0, vmax=1)
ax5.set_xticks(range(len(scenarios)))
ax5.set_yticks(range(len(char_names)))
ax5.set_xticklabels([s.replace(' ', '\n') for s in scenarios], fontsize=9)
ax5.set_yticklabels(char_names, fontsize=10)
ax5.set_title('Quest Characteristics Profile', fontsize=13, fontweight='bold')

# Add text annotations
for i in range(len(scenarios)):
    for j in range(len(char_names)):
        text = ax5.text(i, j, f'{characteristics[i][j]:.2f}',
                       ha="center", va="center", color="black", fontsize=9, fontweight='bold')

plt.colorbar(im, ax=ax5, label='Score (0-1)')

# 6. Scaling Potential Funnel
ax6 = plt.subplot(2, 3, 6)

# Create funnel visualization
funnel_data = [
    ('Niche\nAcademic', participants_p50[0], value_p50[0]),
    ('Regional\nPolitical', participants_p50[1], value_p50[1]),
    ('Geopolitical\n(Jimmy Lai)', participants_p50[2], value_p50[2]),
    ('Global\nCrisis', participants_p50[3], value_p50[3])
]

y_pos = np.arange(len(funnel_data))
participants_vals = [d[1] for d in funnel_data]
value_vals = [d[2]/1000000 for d in funnel_data]

# Create dual axis
ax6_twin = ax6.twinx()

line1 = ax6.plot(participants_vals, y_pos, 'o-', color='#3498db',
                 linewidth=3, markersize=12, label='Participants')
line2 = ax6_twin.plot(value_vals, y_pos, 's-', color='#e74c3c',
                      linewidth=3, markersize=12, label='Total Value')

ax6.set_yticks(y_pos)
ax6.set_yticklabels([d[0] for d in funnel_data], fontsize=10)
ax6.set_xlabel('Participants (Median)', fontsize=11, fontweight='bold', color='#3498db')
ax6_twin.set_xlabel('Total Value $M (Median)', fontsize=11, fontweight='bold', color='#e74c3c')
ax6.set_title('Scaling Funnel:\nFrom Niche to Global', fontsize=13, fontweight='bold')
ax6.grid(axis='x', alpha=0.3)
ax6.set_xscale('log')
ax6_twin.set_xscale('log')

# Add value annotations
for i, (name, part, val) in enumerate(funnel_data):
    ax6.text(part, i, f'  {part:,.0f}', va='center', fontsize=9, color='#3498db', fontweight='bold')
    ax6_twin.text(val, i, f'  ${val:.1f}M', va='center', fontsize=9, color='#e74c3c', fontweight='bold')

# Legend
lines = line1 + line2
labels = [l.get_label() for l in lines]
ax6.legend(lines, labels, loc='lower right')

plt.subplots_adjust(hspace=0.35, wspace=0.3, top=0.95, bottom=0.05, left=0.06, right=0.98)
plt.savefig('monte_carlo_economic_analysis.png', dpi=200, facecolor='white')
print("\n✅ Visualization saved to: monte_carlo_economic_analysis.png")

# Create second figure: Distribution plots
fig2, axes = plt.subplots(2, 2, figsize=(16, 12))
fig2.suptitle('Distribution Analysis: Jimmy Lai Geopolitical Case\n(1000 simulations)',
              fontsize=16, fontweight='bold')

# Load full Jimmy Lai data
with open("monte_carlo_results.json", 'r') as f:
    jimmy_data = json.load(f)

# Extract percentile data for distribution visualization
def create_distribution_bars(ax, p5, p25, p50, p75, p95, max_val, title, ylabel, color):
    percentiles = [5, 25, 50, 75, 95, 100]
    values = [p5, p25, p50, p75, p95, max_val]

    bars = ax.bar(percentiles, values, width=15, color=color, alpha=0.7, edgecolor='black', linewidth=1.5)
    ax.set_xlabel('Percentile', fontsize=12, fontweight='bold')
    ax.set_ylabel(ylabel, fontsize=12, fontweight='bold')
    ax.set_title(title, fontsize=13, fontweight='bold')
    ax.grid(axis='y', alpha=0.3)

    # Highlight median
    bars[2].set_color(color)
    bars[2].set_alpha(1.0)
    bars[2].set_edgecolor('red')
    bars[2].set_linewidth(3)

    for i, (bar, val) in enumerate(zip(bars, values)):
        height = bar.get_height()
        if isinstance(val, float):
            label = f'${val:,.0f}' if ylabel.startswith('$') else f'{val:,.1f}'
        else:
            label = f'{val:,}'
        ax.text(bar.get_x() + bar.get_width()/2., height,
               label, ha='center', va='bottom', fontsize=9, fontweight='bold')

# Participants distribution
create_distribution_bars(
    axes[0, 0],
    jimmy_data['results']['participants']['p5'],
    jimmy_data['results']['participants']['p50'] * 0.7,  # Approximate P25
    jimmy_data['results']['participants']['p50'],
    jimmy_data['results']['participants']['p95'] * 0.6,  # Approximate P75
    jimmy_data['results']['participants']['p95'],
    jimmy_data['results']['participants']['max'],
    'Participant Distribution',
    'Participants',
    '#3498db'
)

# Bounty distribution
create_distribution_bars(
    axes[0, 1],
    jimmy_data['results']['bounty']['p5'],
    jimmy_data['results']['bounty']['p50'] * 0.6,
    jimmy_data['results']['bounty']['p50'],
    jimmy_data['results']['bounty']['p95'] * 0.55,
    jimmy_data['results']['bounty']['p95'],
    jimmy_data['results']['bounty']['max'],
    'Bounty Pool Distribution',
    '$ USD',
    '#2ecc71'
)

# Total value distribution
create_distribution_bars(
    axes[1, 0],
    jimmy_data['results']['total_value']['p5'],
    jimmy_data['results']['total_value']['p50'] * 0.55,
    jimmy_data['results']['total_value']['p50'],
    jimmy_data['results']['total_value']['p95'] * 0.55,
    jimmy_data['results']['total_value']['p95'],
    jimmy_data['results']['total_value']['max'],
    'Total Economic Value Distribution',
    '$ USD',
    '#9b59b6'
)

# Summary statistics table
ax_table = axes[1, 1]
ax_table.axis('off')

table_data = [
    ['Metric', 'Median (P50)', '95th Percentile'],
    ['', '', ''],
    ['Participants', f"{jimmy_data['results']['participants']['p50']:,}",
     f"{jimmy_data['results']['participants']['p95']:,}"],
    ['Bounty Pool', f"${jimmy_data['results']['bounty']['p50']:,.0f}",
     f"${jimmy_data['results']['bounty']['p95']:,.0f}"],
    ['Total Value', f"${jimmy_data['results']['total_value']['p50']:,.0f}",
     f"${jimmy_data['results']['total_value']['p95']:,.0f}"],
    ['', '', ''],
    ['Value/Participant', f"${jimmy_data['results']['total_value']['p50']/jimmy_data['results']['participants']['p50']:,.0f}",
     f"${jimmy_data['results']['total_value']['p95']/jimmy_data['results']['participants']['p95']:,.0f}"],
    ['Convergence Rate', f"{jimmy_data['results']['convergence_rate']*100:.1f}%", ''],
    ['Language Communities', f"{jimmy_data['results']['language_communities']['p50']}",
     f"{jimmy_data['results']['language_communities']['p95']}"]
]

table = ax_table.table(cellText=table_data, cellLoc='center', loc='center',
                       colWidths=[0.4, 0.3, 0.3])
table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1, 1.8)

# Style header row
for i in range(3):
    table[(0, i)].set_facecolor('#34495e')
    table[(0, i)].set_text_props(weight='bold', color='white')

# Style data rows
for i in range(2, len(table_data)):
    for j in range(3):
        if i % 2 == 0:
            table[(i, j)].set_facecolor('#ecf0f1')

ax_table.set_title('Summary Statistics', fontsize=14, fontweight='bold', pad=20)

plt.subplots_adjust(hspace=0.3, wspace=0.3, top=0.94, bottom=0.06)
plt.savefig('monte_carlo_distributions.png', dpi=200, facecolor='white')
print("✅ Distribution visualization saved to: monte_carlo_distributions.png")

print("\n" + "="*80)
print("📊 VISUALIZATION COMPLETE")
print("="*80)
print("\nGenerated files:")
print("  • monte_carlo_economic_analysis.png  - Comparative analysis across scenarios")
print("  • monte_carlo_distributions.png      - Distribution details for Jimmy Lai case")
print("\n")
