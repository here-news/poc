"""
Run multiple scenario simulations to show economic scaling across different quest types
"""

from monte_carlo_economic_simulation import QuestCharacteristics, run_monte_carlo
import json

# Scenario 1: Niche Academic Question (Low scale)
niche_academic = QuestCharacteristics(
    social_impact=0.40,
    political_visibility=0.10,
    global_reach=0.20,
    controversy_level=0.30,
    evidence_accessibility=0.70
)

# Scenario 2: Regional Political Issue (Medium scale)
regional_politics = QuestCharacteristics(
    social_impact=0.60,
    political_visibility=0.65,
    global_reach=0.45,
    controversy_level=0.75,
    evidence_accessibility=0.50
)

# Scenario 3: Jimmy Lai Case (High scale - geopolitical)
jimmy_lai = QuestCharacteristics(
    social_impact=0.85,
    political_visibility=0.90,
    global_reach=0.75,
    controversy_level=0.70,
    evidence_accessibility=0.60
)

# Scenario 4: Global Climate/Health Crisis (Mega scale)
global_crisis = QuestCharacteristics(
    social_impact=0.95,
    political_visibility=0.95,
    global_reach=0.95,
    controversy_level=0.85,
    evidence_accessibility=0.65
)

scenarios = [
    ("Niche Academic Question", niche_academic),
    ("Regional Political Issue", regional_politics),
    ("Jimmy Lai Geopolitical Case", jimmy_lai),
    ("Global Crisis Truth Quest", global_crisis)
]

all_results = {}

for name, characteristics in scenarios:
    print(f"\n{'#'*80}")
    print(f"# SCENARIO: {name}")
    print(f"{'#'*80}")

    results = run_monte_carlo(
        quest_chars=characteristics,
        n_simulations=500,  # Reduced for speed
        days=30
    )

    all_results[name] = results

# Comparison table
print(f"\n{'='*80}")
print(f"COMPARATIVE ANALYSIS: ECONOMIC SCALING ACROSS QUEST TYPES")
print(f"{'='*80}\n")

print(f"{'Scenario':<35} {'Participants (P50)':<20} {'Bounty (P50)':<20} {'Total Value (P50)':<25}")
print(f"{'-'*100}")

for name in all_results:
    result = all_results[name]['results']
    participants = result['participants']['p50']
    bounty = result['bounty']['p50']
    value = result['total_value']['p50']

    print(f"{name:<35} {participants:>15,} {bounty:>15,.0f}$ {value:>20,.0f}$")

print(f"\n{'='*80}\n")

# Save comprehensive results
with open("scenario_comparison.json", 'w') as f:
    json.dump(all_results, f, indent=2, default=str)

print(f"💾 Full results saved to: scenario_comparison.json\n")
