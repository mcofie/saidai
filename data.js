window.works = [
    {
        id: "vellum",
        title: "Vellum",
        year: "2026",
        url: "https://getvellum.org",
        descKey: "proj.vellum",
        metaKey: "meta.platform",
        category: "work"
    },
    {
        id: "graydocket",
        title: "GrayDocket",
        year: "2026",
        url: "https://graydocket.com",
        descKey: "proj.graydocket",
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
        id: "itinero",
        title: "Itinero",
        year: "2025",
        url: "https://tryitinero.com",
        descKey: "proj.itinero",
        metaKey: "meta.aitravel",
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
        id: "minutes",
        title: "Minutes 2 Match",
        year: "2024",
        url: "https://minutes2match.com/",
        descKey: "proj.minutes",
        metaKey: "meta.events",
        category: "work"
    }
];

window.initiatives = [
    {
        id: "goodseed",
        title: "The Good Seed Capital",
        year: "2026",
        url: "https://thegoodseedcapital.com",
        descKey: "proj.goodseed",
        metaKey: "meta.vc",
        category: "initiative"
    },
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
