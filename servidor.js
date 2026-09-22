// const express = require("express");
import express from "express";
const app = express();
const PORT = 3000;

app.use(express.json());

const CAPACIDADE = 20;
const PRECO_PRIMEIRA_HORA = 10;
const PRECO_HORA_ADICIONAL = 5;

let proximoID = 1;
let VEICULOS = [];
let HISTORICO = [];

app.get("/",(req, res)=>{
    res.status(200).json({msg: "API funcionando"});
});

app.post("/veiculos",(req, res)=>{
    const {placa, modelo, cor} = req.body;

    if(![placa, modelo, cor].every(
        (campo) => typeof campo === "string" && campo.trim()
    )){
        return res.status(400).json({
            msg: "Informe a placa, modelo e cor válido"
        })
    }

    const placaNormalizada = placa.trim().toUpperCase();

    if(VEICULOS.length >= CAPACIDADE){
        return res.status(409).json({
            msg: "Estacionamento lotado."
        });
    }

    if(VEICULOS.some((v) => v.placa === placaNormalizada)){
        return res.status(409).json({
            msg: "Veículo já estacionado."
        });
    }

    const veiculo = {
        id : proximoID++,
        placa: placaNormalizada,
        modelo : modelo.trim(),
        cor: cor.trim(),
        entrada: new Date().toISOString()
    };

    VEICULOS.push(veiculo);

    return res.status(201).json({msg: "Entrada registrada", veiculo});
});


app.get("/veiculos",(req,res)=>{
    res.status(200).json({total: VEICULOS.length, VEICULOS});
});

app.get("/veiculos/:id", (req,res)=>{
    const id = Number(req.params.id);
    const veiculo = VEICULOS.find((v) => v.id === id);

    if(!veiculo) return res.status(404).json({msg: "Veículo não encontrado"});
   
    return res.json(veiculo);
});

app.get("/vagas", (req,res) =>{
    res.status(200).json({
        capacidade: CAPACIDADE,
        ocupadas: VEICULOS.length,
        disponiveis: CAPACIDADE - VEICULOS.length
    });
});

function calcularValor(entrada, saida = new Date()){
    const inicio = new Date(entrada);
    const tempoMs = saida.getTime() - inicio.getTime();
    const horas = Math.max(1, Math.ceil(tempoMs / (1000 * 60 * 60)));
    const valor = PRECO_PRIMEIRA_HORA + (horas -1 ) * PRECO_HORA_ADICIONAL;
    return {horasCobradas: horas, valor};
}

app.get("/veiculos/:id/valor", (req, res)=>{
    const veiculo = VEICULOS.find((v) => v.id === Number(req.params.id));
    if(!veiculo) return res.status(404).json({msg: "Veículo não encontrado"});

    return res.json({
        placa : veiculo.placa,
        entrada : veiculo.entrada,
        ...calcularValor(veiculo.entrada)
    });
    
});

app.post("/veiculos/:id/saida", (req, res)=>{
    const indice = VEICULOS.find(v => v.id === Number(req.params.id));
    if(indice === -1) return res.status(404).json({mensagem: "Veículo não encontrado"});

    const veiculo = VEICULOS[indice];
    const saida = new Date();
    const calculo = calcularValor(veiculo.entrada, saida);

    const registro = {
        ...veiculo,
        saida: saida.toISOString(),
        horasCobradas: calculo.horasCobradas,
        valorPago: calculo.valor
    };
    HISTORICO.push(registro);
    VEICULOS.splice(indice, 1);

    res.status(200).json({
        mensagem: "Saida registrada", registro
    });
});

app.put("/veiculos/:id", (req, res)=>{
    const veiculo = VEICULOS.find((v) => v.id === Number(req.params.id)); 
    if(!veiculo) return res.status(404).json({mensagem: "Veículo não encontrado"});

    const {placa, modelo, cor} = req.body;

    if(![placa, modelo, cor].every(
        (campo) => typeof campo === "string" && campo.trim()
    )){
            return res.status(400).json({erro: "Informe placa, modelo e cor válidos"});
    }

    const novaPlaca = placa.trim().toUpperCase();

    if(VEICULOS.some((v) => v.placa === novaPlaca && v.id !== novaPlaca)){
        return res.status(400).json({erro: "Placa já cadastrada"});
    }

    veiculo.placa = novaPlaca;
    veiculo.modelo = modelo.trim();
    veiculo.cor = cor.trim();

    return res.status(201).json({ mensagem: "Veículo atualizado!"});
})

app.get("/historico", (req, res)=>{
    res.json({total: HISTORICO.length, HISTORICO});
});
app.get("/faturamento", (req, res)=>{
    const faturamento = HISTORICO.reduce(
        (total, item) => total + item.valorPago, 0 
    );
    res.json({
        veiculosEstacionados : VEICULOS.length,
        vagasDisponiveis : CAPACIDADE - VEICULOS.length,
        saidaRealizadas: HISTORICO.length,
        faturamento: Number(faturamento.toFixed(2))
    })
});


app.listen(PORT,()=>{
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});