import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TicketsPage } from './tickets.page';

/** Isti format kao link iz mejla (Google skripta, ticketPageUrl_). */
function link(data: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('TicketsPage', () => {
  const open = async (hash: string) => {
    history.replaceState(null, '', '/ulaznice#' + hash);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TicketsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('prikazuje po jednu ulaznicu sa QR kodom za svakog gosta iz linka', async () => {
    const el = await open(
      link({ r: '27006', t: [['27006-1-S4V5T5S3', 'Antonela Parović', 'Galerija'], ['27006-2-YETYR6SR', 'Maja Anić', 'Svečana']] }),
    );
    const tickets = [...el.querySelectorAll('.ticket')];
    expect(tickets).toHaveLength(2);
    expect(tickets[0].querySelector('.name')!.textContent).toBe('Antonela Parović');
    expect(tickets[1].querySelector('.type')!.textContent).toBe('Svečana ulaznica');
    expect(tickets[1].querySelector('.no')!.textContent!.trim()).toBe('Ulaznica 2 od 2');
    expect(tickets[0].querySelector('.code')!.textContent).toBe('27006-1-S4V5T5S3');
    expect(tickets[0].querySelector('.qr path')!.getAttribute('d')!.length).toBeGreaterThan(100);
    expect(el.textContent).toContain('Rezervacija 27006');
  });

  it('neispravan link daje jasnu poruku umesto ulaznica', async () => {
    const el = await open('nesto-pogresno');
    expect(el.querySelector('.ticket')).toBeNull();
    expect(el.textContent).toContain('Ulaznice nisu pronađene');
  });
});
