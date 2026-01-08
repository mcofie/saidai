window.works = [
    {
        id: "rentbase",
        title: "RentBase",
        year: "2025",
        url: "https://rentbase.app/",
        descKey: "proj.rentbase",
        metaKey: "meta.platform",
        category: "work"
    },
    {
        id: "amigo",
        title: "Amigo Lease",
        year: "2025",
        url: "https://amigolease.com",
        descKey: "proj.amigo",
        metaKey: "meta.marketplace",
        category: "work"
    },
    {
        id: "gatepass",
        title: "GatePass",
        year: "2025",
        url: "https://gatepass.so",
        descKey: "proj.gatepass",
        metaKey: "meta.marketplace",
        category: "work"
    },
    {
        id: "happening",
        title: "HappeningNow",
        year: "2025",
        url: "https://happeningnow.online/",
        descKey: "proj.happening",
        metaKey: "meta.eventtech",
        category: "work"
    },
    {
        id: "itinero",
        title: "Itinero",
        year: "2025",
        url: "https://tryitinero.com",
        descKey: "proj.itinero",
        metaKey: "meta.aitravel",
        category: "work"
    },
    {
        id: "knitted",
        title: "Knitted",
        year: "2020",
        url: "https://getknitted.app",
        descKey: "proj.knitted",
        metaKey: "meta.saas",
        category: "work"
    },
    {
        id: "lazypick",
        title: "LazyPick",
        year: "2025",
        url: "https://lazypick.app",
        descKey: "proj.lazypick",
        metaKey: "meta.lifestyle",
        category: "work"
    },
    {
        id: "motorambos",
        title: "Motor Ambos",
        year: "2025",
        url: "https://motorambos.com",
        descKey: "proj.motorambos",
        metaKey: "meta.service",
        category: "work"
    },
    {
        id: "stage",
        title: "Stage & Bloom",
        year: "2025",
        url: "https://stageandbloom.co",
        descKey: "proj.stage",
        metaKey: "meta.platform",
        category: "work"
    }
];

window.initiatives = [
    {
        id: "sandbox",
        title: "Sandbox Reseau",
        year: "2025",
        url: "https://sandboxreseau.com/",
        descKey: "proj.sandbox",
        metaKey: "meta.community",
        category: "initiative"
    }
];

// Combine for random selection if needed, or keep separate to respect "Selected Works" vs "Initiatives" on home.
// User said: "Move all 'Selected Works' and 'Initiatives' ... and always randomly select 3 to show on the index."
// This implies the 3 on index could be from either.
window.allProjects = [...window.works, ...window.initiatives];
