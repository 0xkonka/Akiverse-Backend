CREATE UNIQUE INDEX one_active_play_session_per_arcade_machine
    ON play_sessions (arcade_machine_id) WHERE (state <> 'FINISHED');