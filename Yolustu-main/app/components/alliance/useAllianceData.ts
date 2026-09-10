"use client";

// components/alliance/useAllianceData.ts
import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { AllianceData, MessageData } from './types';

export function useAllianceData(currentUserId: string) {
    const [alliances, setAlliances] = useState<AllianceData[]>([]);
    const [activeAlliance, setActiveAlliance] = useState<AllianceData | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);

    // 1. Firebase-dən İttifaqları CANLI olaraq çəkmək
    useEffect(() => {
        const q = query(collection(db, 'alliances'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: AllianceData[] = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() } as AllianceData);
            });
            setAlliances(list);

            // Cari istifadəçinin klanını tapırıq
            const myAlliance = list.find(item => 
                item.leaderId === currentUserId || (item.members && item.members.includes(currentUserId))
            );
            setActiveAlliance(myAlliance || null);
        }, (error) => {
            console.error("İttifaqları oxuma xətası:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // 2. Çat mesajlarını CANLI dinləmək
    useEffect(() => {
        const q = query(collection(db, 'alliance_chat'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgList: MessageData[] = [];
            snapshot.forEach((docSnap) => {
                msgList.push({ id: docSnap.id, ...docSnap.data() } as MessageData);
            });
            msgList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            
            setMessages(msgList.length > 0 ? msgList : [
                { id: '1', user: 'Sistem', text: 'Canlı ittifaq söhbətinə xoş gəldiniz! 🇦🇿', time: 'İndi', createdAt: Date.now() }
            ]);
        }, (error) => {
            console.error("Çat oxuma xətası:", error);
        });

        return () => unsubscribe();
    }, []);

    return { alliances, activeAlliance, messages, setActiveAlliance };
}