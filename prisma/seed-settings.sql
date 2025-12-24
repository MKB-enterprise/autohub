-- Inserir configurações padrão
INSERT INTO "settings" (
    "id", 
    "opening_time_weekday", 
    "closing_time_weekday", 
    "slot_interval_minutes", 
    "max_cars_per_slot", 
    "timezone",
    "created_at",
    "updated_at"
) VALUES (
    'default',
    '08:00',
    '18:00',
    30,
    2,
    'America/Sao_Paulo',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
