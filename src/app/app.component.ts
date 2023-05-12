import {Component} from '@angular/core';
import {Task} from './models/task'
import {CdkDragDrop, transferArrayItem} from '@angular/cdk/drag-drop';
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {TaskDialogComponent, TaskDialogResult} from "./components/task-dialog/task-dialog.component";
import {BehaviorSubject, Observable} from "rxjs";
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/compat/firestore";

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject<Task[]>([]);
  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });
  return subject;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public title = 'kanban-firebase';

  public todo: Observable<Task[]> = getObservable(this.store.collection('todo')) as Observable<Task[]>

  public inProgress: Observable<Task[]> = getObservable(this.store.collection('inProgress')) as Observable<Task[]>

  public done: Observable<Task[]> = getObservable(this.store.collection('done')) as Observable<Task[]>

  constructor(private dialog: MatDialog, private store: AngularFirestore) {
  }

  public newTask(): void {
    const dialogRef: MatDialogRef<TaskDialogComponent> = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    })

    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult | undefined): void => {
        if (!result) {
          return
        }
        this.store.collection('todo').add(result.task);
      })
  }

  public editTask(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    const dialogRef: MatDialogRef<TaskDialogComponent> = this.dialog.open(TaskDialogComponent, {
      width: '300px',
      data: {
        task,
        enableDelete: true
      },
    })

    dialogRef.afterClosed().subscribe((result: TaskDialogResult | undefined): void => {
      if (!result) {
        return
      }
      if (result.delete) {
        this.store.collection(list).doc(task.id).delete();
      } else {
        this.store.collection(list).doc(task.id).update(task);
      }
    })
  }

  public drop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      return;
    }
    if (!event.previousContainer.data || !event.container.data) {
      return;
    }
    const item = event.previousContainer.data[event.previousIndex]
    this.store.firestore.runTransaction(() => {
      return Promise.all([
        this.store.collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection(event.container.id).add(item),
      ]);
    });

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }
}
