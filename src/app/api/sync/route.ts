import { NextRequest, NextResponse } from 'next/server';
import { gdocEngine } from '@/lib/gdoc_engine';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { documentId, firebaseCollection, firebaseId } = await req.json();

    if (!documentId || !firebaseCollection || !firebaseId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. 구글 독스에서 NamedRange 읽기
    const docData = await gdocEngine.readNamedRanges(documentId);
    
    // 2. 데이터 가공 (예: '90%' -> 90)
    const updatePayload: Record<string, any> = {
        updatedAt: serverTimestamp(),
        syncLog: `Synced from GDoc at ${new Date().toISOString()}`
    };

    if (docData['진도율'] || docData['오늘진도']) {
        const rateStr = docData['진도율'] || docData['오늘진도'];
        const rate = parseInt(rateStr.replace(/[^0-9]/g, ''));
        if (!isNaN(rate)) updatePayload.rate = rate;
    }

    if (docData['상태'] || docData['작업상태']) {
        updatePayload.status = docData['상태'] || docData['작업상태'];
    }

    // 3. Firebase 업데이트
    await updateDoc(doc(db, firebaseCollection, firebaseId), updatePayload);

    return NextResponse.json({ 
        success: true, 
        updatedData: updatePayload 
    });

  } catch (error: any) {
    console.error('❌ [SyncAPI] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
