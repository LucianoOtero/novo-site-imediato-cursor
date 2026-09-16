import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  avgLast3Months,
  buildMonthRows,
  businessDays,
  classifyNegocioCorretora,
  consolidateByVendor,
  eligibleOpp,
  houseTotals,
  inconsistencyFlags,
  isBusinessDay,
  joinOppPolicy,
  project,
  segMatch,
  vendorKey,
} from "../lib/index.mjs";

describe("eligibleOpp", () => {
  it("aceita Vendido com emissão no mês", () => {
    assert.equal(
      eligibleOpp({ stage: "Vendido", cDataDeEmisso: "2026-09-10" }, "2026-09"),
      true,
    );
  });
  it("rejeita emissão fora do mês", () => {
    assert.equal(
      eligibleOpp({ stage: "Vendido", cDataDeEmisso: "2026-08-31" }, "2026-09"),
      false,
    );
  });
  it("rejeita stage ≠ Vendido", () => {
    assert.equal(
      eligibleOpp({ stage: "Prospecting", cDataDeEmisso: "2026-09-10" }, "2026-09"),
      false,
    );
  });
  it("rejeita sem cDataDeEmisso", () => {
    assert.equal(eligibleOpp({ stage: "Vendido" }, "2026-09"), false);
  });
});

describe("calendar / project", () => {
  it("1º jan 2026 não é útil (feriado)", () => {
    assert.equal(isBusinessDay("2026-01-01"), false);
  });
  it("2 jan 2026 é útil (sexta)", () => {
    assert.equal(isBusinessDay("2026-01-02"), true);
  });
  it("businessDays setembro 2026 completo > 0", () => {
    const n = businessDays("2026-09");
    assert.ok(n >= 20 && n <= 23, `got ${n}`);
  });
  it("asOf limita úteis decorridos", () => {
    const full = businessDays("2026-09");
    const partial = businessDays("2026-09", "2026-09-01");
    assert.ok(partial >= 1);
    assert.ok(partial < full);
  });
  it("project dia 1 multiplica pelo mês", () => {
    assert.equal(project(100, 1, 20), 2000);
  });
  it("project mid-mês", () => {
    assert.equal(project(100, 10, 20), 200);
  });
  it("project elapsed 0 devolve metric", () => {
    assert.equal(project(50, 0, 20), 50);
  });
});

describe("joinOppPolicy", () => {
  const opp = {
    cCpftext: "123.456.789-09",
    cSeguradora: "Suhai",
    cDataDeEmisso: "2026-09-10",
    cInicioVigncia: "2026-09-15",
  };
  const base = {
    id: "p1",
    cliente_doc: "12345678909",
    seguradora: "SUHAI SEGUROS S.A.",
    data_emissao: "2026-09-10",
    vigencia_inicio: "2026-09-15",
    comissao_valor: 150,
    is_active: true,
  };

  it("1:1 com doc+seg+emissão", () => {
    const r = joinOppPolicy(opp, [base]);
    assert.equal(r.kind, "one");
    assert.equal(r.via, "cDataDeEmisso");
    assert.equal(r.matches[0].id, "p1");
  });

  it("none sem doc", () => {
    const r = joinOppPolicy({ ...opp, cCpftext: "" }, [base]);
    assert.equal(r.kind, "none");
    assert.equal(r.via, "noDoc");
  });

  it("multi-match", () => {
    const r = joinOppPolicy(opp, [
      base,
      { ...base, id: "p2", business_key: "other" },
    ]);
    assert.equal(r.kind, "multi");
    assert.equal(r.matches.length, 2);
  });

  it("cascade para cInicioVigncia", () => {
    const r = joinOppPolicy(
      {
        ...opp,
        cDataDeEmisso: "2026-09-01",
        cInicioVigncia: "2026-09-20",
      },
      [
        {
          ...base,
          id: "p3",
          data_emissao: null,
          vigencia_inicio: "2026-09-20",
        },
      ],
    );
    assert.equal(r.kind, "one");
    assert.equal(r.via, "cInicioVigncia");
  });

  it("segMatch Porto + Cartão × PORTO SEGURO", () => {
    assert.equal(segMatch("Porto + Cartão", "PORTO SEGURO CIA DE SEGUROS GERAIS"), true);
  });
});

describe("classifyNegocio / orphans", () => {
  it("glossário", () => {
    assert.equal(classifyNegocioCorretora("NOVO NEGÓCIO"), "venda_nova");
    assert.equal(classifyNegocioCorretora("NEGÓCIO PRÓPRIO"), "renovacao");
  });

  it("só-Agger renovação fora; venda nova entra", () => {
    const opps = [
      {
        id: "o1",
        stage: "Vendido",
        cDataDeEmisso: "2026-09-05",
        amount: 100,
        assignedUserId: "u1",
        assignedUserName: "Ana",
        cCpftext: "11122233344",
        cSeguradora: "Youse",
        amountCurrency: "BRL",
      },
    ];
    const policies = [
      {
        id: "matched",
        cliente_doc: "11122233344",
        seguradora: "YOUSE",
        data_emissao: "2026-09-05",
        comissao_valor: 90,
        is_active: true,
        raw: { "NEGÓCIO CORRETORA": "NOVO NEGÓCIO" },
        vendedor: "Ana",
      },
      {
        id: "renov",
        cliente_doc: "99988877766",
        seguradora: "YOUSE",
        data_emissao: "2026-09-08",
        comissao_valor: 50,
        is_active: true,
        raw: { "NEGÓCIO CORRETORA": "NEGÓCIO PRÓPRIO" },
        vendedor: "Bob",
        cliente_nome: "Cliente Renov",
      },
      {
        id: "nova",
        cliente_doc: "55566677788",
        seguradora: "YOUSE",
        data_emissao: "2026-09-08",
        comissao_valor: 40,
        is_active: true,
        raw: { "NEGÓCIO CORRETORA": "NOVO NEGÓCIO" },
        vendedor: "Carol",
        cliente_nome: "Cliente Nova",
      },
    ];
    const rows = buildMonthRows({ opps, policies, month: "2026-09" });
    assert.equal(rows.filter((r) => r.source === "espo").length, 1);
    assert.equal(rows.find((r) => r.source === "espo").emitido, 90);
    const orphans = rows.filter((r) => r.source === "agger_only");
    assert.equal(orphans.length, 1);
    assert.equal(orphans[0].policy.id, "nova");
    assert.equal(orphans[0].produzido, 0);
    assert.equal(orphans[0].emitido, 40);
  });
});

describe("flags + consolidate", () => {
  it("multiMatch e amount0", () => {
    assert.deepEqual(
      inconsistencyFlags({
        source: "espo",
        produzido: 0,
        matchKind: "multi",
        matchVia: "cDataDeEmisso",
        amountCurrency: "BRL",
        vendorName: "X",
      }),
      ["amount0", "multiMatch"],
    );
  });

  it("consolida e projeta; house totals divergem soma vs casa", () => {
    const rows = [
      {
        source: "espo",
        vendorId: "a",
        vendorName: "A",
        produzido: 100,
        emitido: 80,
        flags: [],
      },
      {
        source: "espo",
        vendorId: "b",
        vendorName: "B",
        produzido: 50,
        emitido: 40,
        flags: ["noMatch"],
      },
    ];
    const cons = consolidateByVendor(rows, {
      month: "2026-09",
      asOf: "2026-09-01",
    });
    assert.equal(cons.vendors.length, 2);
    assert.ok(cons.daysElapsed >= 1);
    const house = houseTotals(rows, cons);
    assert.equal(house.produzido, 150);
    assert.equal(house.emitido, 120);
    // no dia 1, soma vendedores === casa (linear)
    assert.equal(
      Math.round(house.projetadoProduzidoSomaVendedores),
      Math.round(house.projetadoProduzidoCasa),
    );
  });

  it("avgLast3Months", () => {
    const hist = {
      "2026-06": [
        { source: "espo", vendorId: "a", vendorName: "A", produzido: 30 },
      ],
      "2026-07": [
        { source: "espo", vendorId: "a", vendorName: "A", produzido: 60 },
      ],
      "2026-08": [
        { source: "espo", vendorId: "a", vendorName: "A", produzido: 90 },
      ],
    };
    const k = vendorKey(hist["2026-06"][0]);
    assert.equal(avgLast3Months(k, hist), 60);
  });
});
