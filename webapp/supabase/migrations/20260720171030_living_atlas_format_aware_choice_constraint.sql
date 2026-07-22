-- True/false is an authored two-choice format. All other currently supported
-- assessment formats retain the four-choice contract.

alter table public.practice_variants
  drop constraint if exists practice_variants_four_choices;

alter table public.practice_variants
  add constraint practice_variants_format_aware_choices
  check (
    jsonb_typeof(choices) = 'array'
    and choices ? correct_choice
    and (
      -- Frozen legacy automatic conversions stay auditable but are not
      -- delivered. Their four-choice true/false shape must not prevent the
      -- correct contract for all current content.
      (status = 'stale' and jsonb_array_length(choices) = 4)
      or (item_format = 'true_false' and jsonb_array_length(choices) = 2)
      or (coalesce(item_format, 'single_best_answer') <> 'true_false' and jsonb_array_length(choices) = 4)
    )
  );
