from ..models import AttributeDefinition, AttributeSchema


MEMORY_SCHEMA = AttributeSchema(
    name="memory_pc_v1",
    definitions=(
        AttributeDefinition("brand", "Marca", ("marca", "brand"), "title"),
        AttributeDefinition("model", "Modelo", ("modelo", "model")),
        AttributeDefinition("memory_types", "Tipo de memoria RAM", ("tipo de ram", "tipo ram", "tipo de memoria ram", "memory type", "memory types", "tecnología de memoria"), "memory_types"),
        AttributeDefinition("capacity", "Capacidad", ("capacidad", "capacity", "capacidad total")),
        AttributeDefinition("speed_mts", "Velocidad", ("velocidad", "memory speed", "frecuencia", "bus"), "mts"),
        AttributeDefinition("latency", "Latencia", ("latencia", "latency", "cas latency", "cl")),
        AttributeDefinition("voltage", "Voltaje", ("voltaje", "voltage")),
        AttributeDefinition("form_factor", "Formato", ("formato", "factor de forma", "form factor"), "form_factor"),
        AttributeDefinition("modules", "Cantidad de módulos", ("cantidad de módulos", "cantidad de modulos", "modules", "kit"), "integer"),
        AttributeDefinition("rgb", "RGB", ("rgb", "iluminación rgb", "iluminacion rgb"), "boolean"),
    ),
)
