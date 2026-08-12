from ..models import AttributeDefinition, AttributeSchema


CPU_SCHEMA = AttributeSchema(
    name="cpu_v1",
    definitions=(
        AttributeDefinition("brand", "Marca", ("marca", "brand"), "title"),
        AttributeDefinition("model", "Modelo", ("modelo", "model")),
        AttributeDefinition("architecture", "Arquitectura", ("arquitectura", "architecture"), "title"),
        AttributeDefinition("family", "Familia", ("familia", "family", "familia de productos"), "title"),
        AttributeDefinition(
            "socket",
            "Socket",
            ("socket", "cpu socket", "cpu socket type", "zócalo", "zócalos compatibles", "socket de cpu"),
            "socket",
        ),
        AttributeDefinition("cores", "Núcleos", ("núcleos", "cantidad de núcleos", "núcleos totales", "# of cores", "cores"), "integer"),
        AttributeDefinition("threads", "Hilos", ("hilos", "hilos totales", "subprocesos", "threads", "# of threads"), "integer"),
        AttributeDefinition("base_clock_ghz", "Frecuencia base", ("frecuencia base", "base clock", "processor base frequency"), "ghz"),
        AttributeDefinition("boost_clock_ghz", "Frecuencia máxima", ("frecuencia máxima", "frecuencia maxima", "boost clock", "max boost clock", "frecuencia turbo"), "ghz"),
        AttributeDefinition("cache_l3_mb", "Caché L3", ("caché l3", "cache l3", "l3 cache", "caché total l3"), "mb"),
        AttributeDefinition("memory_types", "Tipo de memoria RAM", ("tipo de ram", "tipo ram", "tipo de memoria ram", "memory type", "memory types"), "memory_types"),
        AttributeDefinition("max_memory_speed_mts", "Velocidad máxima de memoria RAM", ("velocidad máxima de memoria ram", "velocidad maxima de memoria ram", "max memory speed", "memory speed"), "mts"),
        AttributeDefinition("pcie_version", "Versión PCI Express", ("versión pci express", "version pci express", "pci express", "pcie version", "pci-e"), "pcie"),
        AttributeDefinition("integrated_gpu", "Gráficos integrados", ("gráficos integrados", "graficos integrados", "integrated graphics", "integrated gpu", "igpu"), "boolean"),
        AttributeDefinition("integrated_gpu_model", "Modelo gráficos integrados", ("modelo gráficos integrados", "modelo graficos integrados", "graphics model", "gpu model")),
        AttributeDefinition("cooler_included", "CPU cooler incluido", ("cpu cooler incluido", "cooler incluido", "incluye cooler", "thermal solution"), "boolean"),
        AttributeDefinition("tdp_w", "TDP", ("tdp", "default tdp", "thermal design power"), "watts"),
        AttributeDefinition("lithography_nm", "Litografía", ("litografía", "litografia", "lithography", "process technology"), "nm"),
    ),
)
