-- G09 Categorías de violencia (barras horizontales). Conteo por categoría confirmada. Diaria.
select 'G09' as graph_id, 1 as metric_version,
       categoria as serie, count(*) as value
from (
    select jsonb_array_elements_text(coalesce(metadata->'categoriesConfirmed', '[]'::jsonb)) as categoria
    from {{ source('sinapve', 'reports') }}
) c
group by 1, 2, categoria
order by value desc
