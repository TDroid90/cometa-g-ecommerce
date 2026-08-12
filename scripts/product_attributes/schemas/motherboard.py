from ..models import AttributeDefinition, AttributeSchema


MOTHERBOARD_SCHEMA = AttributeSchema(
    name="motherboard_v1",
    definitions=(
        AttributeDefinition("brand", "Marca", ("marca", "brand"), "title"),
        AttributeDefinition("model", "Modelo", ("modelo", "model")),
        AttributeDefinition("socket", "Socket", ("socket", "cpu socket", "cpu socket type", "zócalo", "socket de cpu"), "socket"),
        AttributeDefinition("chipset", "Chipset", ("chipset", "chipset principal", "north bridge")),
        AttributeDefinition("form_factor", "Formato", ("formato", "factor de forma", "form factor"), "form_factor"),
        AttributeDefinition("memory_types", "Tipo de memoria RAM", ("tipo de ram", "tipo ram", "tipo de memoria ram", "memory type", "memory types"), "memory_types"),
        AttributeDefinition("memory_slots", "Ranuras de memoria RAM", ("ranuras de memoria ram", "ranuras de memoria", "memory slots", "dimm slots"), "integer"),
        AttributeDefinition("max_memory_speed_mts", "Velocidad máxima de memoria RAM", ("velocidad máxima de memoria ram", "velocidad maxima de memoria ram", "max memory speed", "memory speed"), "mts"),
        AttributeDefinition("pcie_version", "Versión PCI Express", ("versión pci express", "version pci express", "pci express", "pcie version", "pci-e"), "pcie"),
        AttributeDefinition("wifi", "WiFi", ("wifi", "wi-fi", "wireless lan"), "boolean"),
        AttributeDefinition("bluetooth", "Bluetooth", ("bluetooth",), "boolean"),
    ),
)
