from datetime import datetime, timedelta
import math

print("=" * 60)
print("INVESTIGAÇÃO: Por que Dashboard mostra 01/04?")
print("=" * 60)
print()

# Dados do Jonas
completed_credits = 2.26
remaining_credits = 205.65
C = 7
prior = 5.0

print("DADOS DE ENTRADA:")
print(f"  Créditos obtidos: {completed_credits}")
print(f"  Créditos restantes: {remaining_credits}")
print(f"  C (inércia): {C}")
print(f"  Prior: {prior} créd/dia")
print()

# Testar diferentes cenários de dias_ativos
print("CENÁRIO 1: Testando diferentes dias_ativos")
print("-" * 60)

base_date_str = "2026-01-19"
target_date_str = "2026-04-01"

base_date = datetime.strptime(base_date_str, "%Y-%m-%d")
target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
target_delta = (target_date - base_date).days

print(f"Data base: {base_date_str}")
print(f"Data alvo do dashboard: {target_date_str}")
print(f"Diferença: {target_delta} dias")
print()

for days_active in range(1, 15):
    velocity = (C * prior + completed_credits) / (C + days_active)
    days_remaining = math.ceil(remaining_credits / velocity)
    conclusion_date = base_date + timedelta(days=days_remaining)
    
    match = "⭐ MATCH!" if days_remaining == target_delta else ""
    
    print(f"dias_ativos={days_active:2d}: vel={velocity:.2f}, dias={days_remaining:3d}, data={conclusion_date.strftime('%d/%m')} {match}")

print()
print("CENÁRIO 2: Testando diferentes priors (dias_ativos=6)")
print("-" * 60)

days_active_test = 6

for test_prior in [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]:
    velocity = (C * test_prior + completed_credits) / (C + days_active_test)
    days_remaining = math.ceil(remaining_credits / velocity)
    conclusion_date = base_date + timedelta(days=days_remaining)
    
    match = "⭐ MATCH!" if days_remaining == target_delta else ""
    
    print(f"prior={test_prior:.1f}: vel={velocity:.2f}, dias={days_remaining:3d}, data={conclusion_date.strftime('%d/%m')} {match}")

print()
print("CENÁRIO 3: Testando data base = 14/01 (dia da última aula)")
print("-" * 60)

alt_base_str = "2026-01-14"
alt_base = datetime.strptime(alt_base_str, "%Y-%m-%d")
alt_target_delta = (target_date - alt_base).days

print(f"Nova data base: {alt_base_str}")
print(f"Diferença até 01/04: {alt_target_delta} dias")
print()

for days_active in range(1, 10):
    velocity = (C * prior + completed_credits) / (C + days_active)
    days_remaining = math.ceil(remaining_credits / velocity)
    conclusion_date = alt_base + timedelta(days=days_remaining)
    
    match = "⭐ MATCH!" if days_remaining == alt_target_delta else ""
    
    print(f"dias_ativos={days_active:2d}: vel={velocity:.2f}, dias={days_remaining:3d}, data={conclusion_date.strftime('%d/%m')} {match}")

print()
print("=" * 60)
print("CONCLUSÃO")
print("=" * 60)

# Calcular qual combinação dá 01/04
velocity_for_target = remaining_credits / target_delta
required_sum = velocity_for_target * (C + 6) - C * prior

print(f"Para chegar em 01/04 com data base 19/01:")
print(f"  Dias necessários: {target_delta}")
print(f"  Velocidade necessária: {velocity_for_target:.3f} créd/dia")
print(f"  Créditos completed necessários: {required_sum:.3f}")
print(f"  Créditos reais do Jonas: {completed_credits}")
print()
print(f"Diferença: Jonas tem {completed_credits - required_sum:.2f} créditos a menos")
print(f"Isso indica que o dashboard pode estar usando dados diferentes!")
